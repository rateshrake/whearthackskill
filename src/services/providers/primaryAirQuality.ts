/**
 * VayuShield Backend Services — Provider Adapter
 * Module: primaryAirQuality.ts
 *
 * Primary Google Maps Air Quality API (header-authenticated) with resilient
 * failover to Open-Meteo Air Quality API (UTC-normalized timestamps, current hour lookup).
 */

import type { DiurnalObservation } from "@/engine";
import { fetchWithResilience } from "../resilientHttp";

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
      const res = await fetchWithResilience(url, {
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
      });

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

        // Synthesize 48h forecast trajectory aligned with current conditions
        const forecastObservations: DiurnalObservation[] = [];
        const base = Date.now();
        for (let h = 0; h < 48; h++) {
          const timeIso = new Date(base + h * 3600 * 1000).toISOString();
          const hourOfDay = (new Date(timeIso).getUTCHours() + 5) % 24; // Approx IST
          let factor = 1.0;
          if (hourOfDay >= 5 && hourOfDay <= 9) factor = 1.45;
          else if (hourOfDay >= 13 && hourOfDay <= 16) factor = 0.55;

          forecastObservations.push({
            timestampIso: timeIso,
            pm25: Number((current.pm25 * factor).toFixed(1)),
            pm10: Number((current.pm10 * factor).toFixed(1)),
            humidityPct: factor > 1.2 ? 82 : 55,
          });
        }

        return {
          source: "google_maps",
          current,
          forecastObservations,
        };
      }
    } catch {
      // Fall through cleanly to Open-Meteo failover
    }
  }

  // Open-Meteo Air Quality Failover (<= 10 hourly variables, forecast_days=3, UTC)
  const openMeteoUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?` +
    `latitude=${lat}&longitude=${lon}&forecast_days=3&timezone=UTC` +
    `&current=pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide` +
    `&hourly=pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide`;

  const response = await fetchWithResilience(openMeteoUrl, {
    provider: "open_meteo_aq",
    timeoutMs: 4000,
    maxRetries: 1,
  });

  if (!response.ok) {
    throw new Error(
      `Open-Meteo failover returned status ${response.status}: ${response.statusText}`,
    );
  }

  const openMeteoData = JSON.parse(response.bodyText) as {
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
  };

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

  const forecastObservations: DiurnalObservation[] = [];
  const limit = Math.min(48, times.length);
  for (let i = 0; i < limit; i++) {
    forecastObservations.push({
      timestampIso: normalizeUtcTimestampToIso(times[i]),
      pm25: finiteOr(pm25Arr[i], current.pm25),
      pm10: finiteOr(pm10Arr[i], current.pm10),
      humidityPct: 65,
    });
  }

  return {
    source: "open_meteo",
    current,
    forecastObservations,
  };
}
