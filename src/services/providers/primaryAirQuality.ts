/**
 * VayuShield Backend Services — Provider Adapter
 * Module: primaryAirQuality.ts
 *
 * Primary Google Maps Air Quality API (header-authenticated, current + forecast)
 * with resilient failover to Open-Meteo Air Quality & Weather RH APIs (UTC-normalized).
 */

import type { DiurnalObservation } from "@/engine";
import { fetchWithResilience, redactSecrets } from "../resilientHttp";

export interface PrimaryAqiFetchResult {
  source: "google_maps" | "open_meteo";
  current: {
    pm25: number;
    pm10: number;
    no2: number;
    o3: number;
    so2: number;
    co: number;
  };
  forecastObservations: DiurnalObservation[];
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Normalizes Open-Meteo ISO-8601 timestamps (which omit trailing 'Z' when UTC)
 * so JS Date parsing never shifts timestamps by the host process timezone.
 */
export function normalizeUtcTimestampToIso(rawTimestamp?: string): string {
  if (!rawTimestamp) {
    return new Date().toISOString();
  }
  const trimmed = rawTimestamp.trim();
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const utcString = hasOffset ? trimmed : `${trimmed}Z`;
  const parsedMs = Date.parse(utcString);
  return Number.isFinite(parsedMs)
    ? new Date(parsedMs).toISOString()
    : new Date().toISOString();
}

function findCurrentHourlyIndex(times: readonly string[]): number {
  if (times.length === 0) return 0;
  const currentHourPrefix = new Date().toISOString().slice(0, 13);
  const idx = times.findIndex((t) =>
    normalizeUtcTimestampToIso(t).startsWith(currentHourPrefix),
  );
  return idx >= 0 ? idx : 0;
}

/**
 * Fetches hourly relative_humidity_2m from Open-Meteo Weather API so hygroscopic
 * optical particle growth correction (RH > 75%) receives live atmospheric moisture data.
 */
async function fetchOpenMeteoHumidityMap(
  lat: number,
  lon: number,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}&forecast_days=3&timezone=UTC&hourly=relative_humidity_2m`;
    const res = await fetchWithResilience(weatherUrl, {
      provider: "open_meteo_weather",
      timeoutMs: 3000,
      maxRetries: 1,
    });
    if (!res.ok) {
      console.warn(
        `[primaryAirQuality] Open-Meteo RH lookup returned HTTP ${res.status}`,
      );
      return map;
    }
    const parsed = JSON.parse(res.bodyText) as {
      hourly?: {
        time?: string[];
        relative_humidity_2m?: number[];
      };
    };
    const times = parsed.hourly?.time ?? [];
    const rhValues = parsed.hourly?.relative_humidity_2m ?? [];
    for (let i = 0; i < times.length; i++) {
      const rh = rhValues[i];
      if (typeof rh === "number" && Number.isFinite(rh)) {
        map.set(normalizeUtcTimestampToIso(times[i]), rh);
      }
    }
  } catch (err: unknown) {
    console.warn(
      "[primaryAirQuality] Open-Meteo RH lookup failed:",
      redactSecrets(err instanceof Error ? err.message : String(err)),
    );
  }
  return map;
}

interface OpenMeteoAqPayload {
  current?: {
    pm2_5?: number;
    pm10?: number;
    nitrogen_dioxide?: number;
    ozone?: number;
    sulphur_dioxide?: number;
    carbon_monoxide?: number;
  };
  hourly?: {
    time?: string[];
    pm2_5?: number[];
    pm10?: number[];
    nitrogen_dioxide?: number[];
    ozone?: number[];
    sulphur_dioxide?: number[];
    carbon_monoxide?: number[];
  };
}

function buildOpenMeteoUrl(lat: number, lon: number): string {
  return (
    `https://air-quality-api.open-meteo.com/v1/air-quality?` +
    `latitude=${lat}&longitude=${lon}&forecast_days=3&timezone=UTC` +
    `&current=pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide` +
    `&hourly=pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide`
  );
}

function buildObservationsFromOpenMeteo(
  openMeteoData: OpenMeteoAqPayload,
  humidityMap: Map<string, number>,
  fallbackPm25: number,
  fallbackPm10: number,
): DiurnalObservation[] {
  const hourly = openMeteoData.hourly;
  const times = hourly?.time ?? [];
  const pm25Arr = hourly?.pm2_5 ?? [];
  const pm10Arr = hourly?.pm10 ?? [];
  const observations: DiurnalObservation[] = [];
  const limit = Math.min(48, times.length);
  for (let i = 0; i < limit; i++) {
    const timestampIso = normalizeUtcTimestampToIso(times[i]);
    const rh = humidityMap.get(timestampIso);
    observations.push({
      timestampIso,
      pm25: finiteOr(pm25Arr[i], fallbackPm25),
      pm10: finiteOr(pm10Arr[i], fallbackPm10),
      ...(rh !== undefined ? { humidityPct: rh } : {}),
    });
  }
  return observations;
}

/**
 * Generates an IST (+5:30) aligned deterministic 48h diurnal curve when all hourly
 * forecast endpoints are unavailable, without inventing fake RH values.
 */
export function buildDeterministicDiurnalCurve(
  basePm25: number,
  basePm10: number,
  humidityMap?: Map<string, number>,
  baseTimeMs = Date.now(),
): DiurnalObservation[] {
  const istOffsetMs = 330 * 60 * 1000;
  const observations: DiurnalObservation[] = [];
  for (let h = 0; h < 48; h++) {
    const tsMs = baseTimeMs + h * 3600 * 1000;
    const timeIso = new Date(tsMs).toISOString();
    const hourKey = `${timeIso.slice(0, 13)}:00:00.000Z`;
    const istHour = new Date(tsMs + istOffsetMs).getUTCHours();

    let factor = 1.0;
    if (istHour >= 5 && istHour <= 9) factor = 1.35;
    else if (istHour >= 13 && istHour <= 16) factor = 0.65;
    else if (istHour >= 21 || istHour <= 2) factor = 1.15;

    const rh = humidityMap?.get(hourKey) ?? humidityMap?.get(timeIso);
    observations.push({
      timestampIso: timeIso,
      pm25: Number((basePm25 * factor).toFixed(1)),
      pm10: Number((basePm10 * factor).toFixed(1)),
      ...(rh !== undefined ? { humidityPct: rh } : {}),
    });
  }
  return observations;
}

async function fetchGoogleMapsHourlyForecast(
  lat: number,
  lon: number,
  apiKey: string,
  humidityMap: Map<string, number>,
  fallbackPm25: number,
  fallbackPm10: number,
): Promise<DiurnalObservation[]> {
  try {
    const forecastUrl = "https://airquality.googleapis.com/v1/forecast:lookup";
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const res = await fetchWithResilience(forecastUrl, {
      provider: "google_maps",
      timeoutMs: 3500,
      maxRetries: 0,
      requestInit: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify({
          location: { latitude: lat, longitude: lon },
          period: { startTime, endTime },
          pageSize: 48,
          extraComputations: ["POLLUTANT_CONCENTRATION"],
        }),
      },
    });
    if (!res.ok) {
      return [];
    }
    const parsed = JSON.parse(res.bodyText) as {
      hourlyForecasts?: Array<{
        dateTime?: string;
        pollutants?: Array<{
          code?: string;
          concentration?: { value?: number };
        }>;
      }>;
    };
    const forecasts = parsed.hourlyForecasts ?? [];
    if (forecasts.length < 2) {
      return [];
    }
    const observations: DiurnalObservation[] = [];
    for (const item of forecasts.slice(0, 48)) {
      if (!item.dateTime) continue;
      const timestampIso = normalizeUtcTimestampToIso(item.dateTime);
      const pollutants = item.pollutants ?? [];
      const getVal = (code: string, fallback: number): number => {
        const matched = pollutants.find(
          (p) => p.code?.toLowerCase() === code.toLowerCase(),
        );
        return finiteOr(matched?.concentration?.value, fallback);
      };
      const rh = humidityMap.get(timestampIso);
      observations.push({
        timestampIso,
        pm25: getVal("pm25", fallbackPm25),
        pm10: getVal("pm10", fallbackPm10),
        ...(rh !== undefined ? { humidityPct: rh } : {}),
      });
    }
    return observations;
  } catch (err: unknown) {
    console.warn(
      "[primaryAirQuality] Google Maps hourly forecast unavailable:",
      redactSecrets(err instanceof Error ? err.message : String(err)),
    );
    return [];
  }
}

/**
 * Primary Ingestion: Fetches from Google Maps Air Quality API or fails over to Open-Meteo.
 */
export async function fetchPrimaryAirQuality(
  lat: number,
  lon: number,
): Promise<PrimaryAqiFetchResult> {
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (googleApiKey) {
    try {
      const url = "https://airquality.googleapis.com/v1/currentConditions:lookup";
      const [res, humidityMap] = await Promise.all([
        fetchWithResilience(url, {
          provider: "google_maps",
          timeoutMs: 3500,
          maxRetries: 0,
          requestInit: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": googleApiKey,
            },
            body: JSON.stringify({
              location: { latitude: lat, longitude: lon },
              extraComputations: ["POLLUTANT_CONCENTRATION", "LOCAL_AQI"],
            }),
          },
        }),
        fetchOpenMeteoHumidityMap(lat, lon),
      ]);

      if (res.ok) {
        const data = JSON.parse(res.bodyText) as {
          pollutants?: Array<{
            code?: string;
            concentration?: { value?: number };
          }>;
        };

        const pollutants = data.pollutants ?? [];
        const findVal = (code: string, fallback: number): number => {
          const p = pollutants.find(
            (item) => item.code?.toLowerCase() === code.toLowerCase(),
          );
          return finiteOr(p?.concentration?.value, fallback);
        };

        const current = {
          pm25: findVal("pm25", 85.0),
          pm10: findVal("pm10", 160.0),
          no2: findVal("no2", 45.0),
          o3: findVal("o3", 35.0),
          so2: findVal("so2", 15.0),
          co: findVal("co", 1.2),
        };

        // Prefer Google Maps hourly forecast, then Open-Meteo AQ hourly forecast, then IST trajectory
        let forecastObservations = await fetchGoogleMapsHourlyForecast(
          lat,
          lon,
          googleApiKey,
          humidityMap,
          current.pm25,
          current.pm10,
        );

        if (forecastObservations.length < 2) {
          try {
            const omForecastRes = await fetchWithResilience(buildOpenMeteoUrl(lat, lon), {
              provider: "open_meteo_aq",
              timeoutMs: 3500,
              maxRetries: 0,
            });
            if (omForecastRes.ok) {
              const omJson = JSON.parse(omForecastRes.bodyText) as OpenMeteoAqPayload;
              forecastObservations = buildObservationsFromOpenMeteo(
                omJson,
                humidityMap,
                current.pm25,
                current.pm10,
              );
            }
          } catch (omErr: unknown) {
            console.warn(
              "[primaryAirQuality] Open-Meteo hourly supplement unavailable:",
              redactSecrets(omErr instanceof Error ? omErr.message : String(omErr)),
            );
          }
        }

        if (forecastObservations.length < 2) {
          forecastObservations = buildDeterministicDiurnalCurve(
            current.pm25,
            current.pm10,
            humidityMap,
          );
        }

        return {
          source: "google_maps",
          current,
          forecastObservations,
        };
      }
    } catch (err: unknown) {
      console.warn(
        "[primaryAirQuality] Google Maps AQ failed, failing over to Open-Meteo:",
        redactSecrets(err instanceof Error ? err.message : String(err)),
      );
    }
  }

  // Open-Meteo Air Quality + Weather Relative Humidity Failover (forecast_days=3, UTC)
  const [response, humidityMap] = await Promise.all([
    fetchWithResilience(buildOpenMeteoUrl(lat, lon), {
      provider: "open_meteo_aq",
      timeoutMs: 4000,
      maxRetries: 1,
    }),
    fetchOpenMeteoHumidityMap(lat, lon),
  ]);

  if (!response.ok) {
    throw new Error(
      `Open-Meteo failover returned status ${response.status}: ${response.statusText}`,
    );
  }

  const openMeteoData = JSON.parse(response.bodyText) as OpenMeteoAqPayload;
  const hourly = openMeteoData.hourly;
  const times = hourly?.time ?? [];
  const pm25Arr = hourly?.pm2_5 ?? [];
  const pm10Arr = hourly?.pm10 ?? [];
  const no2Arr = hourly?.nitrogen_dioxide ?? [];
  const o3Arr = hourly?.ozone ?? [];
  const so2Arr = hourly?.sulphur_dioxide ?? [];
  const coArr = hourly?.carbon_monoxide ?? [];

  const curIdx = findCurrentHourlyIndex(times);
  const currentApi = openMeteoData.current;

  const current = {
    pm25: finiteOr(currentApi?.pm2_5 ?? pm25Arr[curIdx], 75.0),
    pm10: finiteOr(currentApi?.pm10 ?? pm10Arr[curIdx], 140.0),
    no2: finiteOr(currentApi?.nitrogen_dioxide ?? no2Arr[curIdx], 40.0),
    o3: finiteOr(currentApi?.ozone ?? o3Arr[curIdx], 30.0),
    so2: finiteOr(currentApi?.sulphur_dioxide ?? so2Arr[curIdx], 12.0),
    co: Number(
      (finiteOr(currentApi?.carbon_monoxide ?? coArr[curIdx], 500) / 1000).toFixed(2),
    ),
  };

  let forecastObservations = buildObservationsFromOpenMeteo(
    openMeteoData,
    humidityMap,
    current.pm25,
    current.pm10,
  );

  if (forecastObservations.length < 2) {
    forecastObservations = buildDeterministicDiurnalCurve(
      current.pm25,
      current.pm10,
      humidityMap,
    );
  }

  return {
    source: "open_meteo",
    current,
    forecastObservations,
  };
}
