/**
 * VayuShield Backend Services — Provider Adapter
 * Module: groundStation.ts
 *
 * Ground station skew check via WAQI / AQICN with OpenAQ v3 failover.
 * Caches raw station telemetry independently of model PM2.5 and uses a single
 * shared skew-classification helper.
 */

import { calculateCpcbAqi } from "@/engine";
import { CACHE_TTL_MS, globalStationCache } from "../gridCache";
import { fetchWithResilience } from "../resilientHttp";
import { MANDATORY_ATTRIBUTIONS } from "../airQualityAggregator";

export interface GroundStationCheck {
  stationName: string;
  originatingAgency: string;
  stationAqi: number;
  stationPm25: number;
  cityModelPm25: number;
  stationVsCitySkewPct: number;
  classification: "micro_hotspot" | "background_buffer" | "consistent";
  attribution: string;
}

export interface RawStationReading {
  source: "waqi" | "openaq";
  stationName: string;
  originatingAgency: string;
  stationAqi: number;
  stationPm25: number;
  attribution: string;
}

/**
 * Classifies ground station vs city background model skew using a single shared rule.
 */
export function classifyStationSkew(
  reading: RawStationReading,
  cityModelPm25: number,
): GroundStationCheck {
  const skewPct =
    cityModelPm25 > 0
      ? Number((((reading.stationPm25 - cityModelPm25) / cityModelPm25) * 100).toFixed(1))
      : 0;

  let classification: GroundStationCheck["classification"] = "consistent";
  if (skewPct >= 25.0) {
    classification = "micro_hotspot";
  } else if (skewPct <= -25.0) {
    classification = "background_buffer";
  }

  return {
    stationName: reading.stationName,
    originatingAgency: reading.originatingAgency,
    stationAqi: reading.stationAqi,
    stationPm25: reading.stationPm25,
    cityModelPm25,
    stationVsCitySkewPct: skewPct,
    classification,
    attribution: reading.attribution,
  };
}

function isRawStationReading(value: unknown): value is RawStationReading {
  return (
    value !== null &&
    typeof value === "object" &&
    "source" in value &&
    "stationPm25" in value
  );
}

/**
 * Fetches nearest ground station reading (cached by 0.01° grid for 30 minutes).
 */
export async function fetchRawGroundStation(
  lat: number,
  lon: number,
): Promise<RawStationReading | null> {
  const cacheKey = `station:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = globalStationCache.get(cacheKey);
  if (isRawStationReading(cached)) {
    return cached;
  }

  const waqiToken = process.env.WAQI_TOKEN;
  if (waqiToken) {
    try {
      const waqiUrl = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${encodeURIComponent(waqiToken)}`;
      const res = await fetchWithResilience(waqiUrl, {
        provider: "waqi",
        timeoutMs: 3000,
        maxRetries: 1,
      });

      if (res.ok) {
        const body = JSON.parse(res.bodyText) as {
          status?: string;
          data?: {
            aqi?: number;
            city?: { name?: string };
            attributions?: Array<{ name?: string }>;
            iaqi?: { pm25?: { v?: number } };
          };
        };

        const stationPm25 = body.data?.iaqi?.pm25?.v;
        if (
          body.status === "ok" &&
          body.data &&
          typeof stationPm25 === "number" &&
          Number.isFinite(stationPm25)
        ) {
          const reading: RawStationReading = {
            source: "waqi",
            stationName: body.data.city?.name ?? "Nearest Ground Station",
            originatingAgency:
              body.data.attributions?.[0]?.name ??
              "Central Pollution Control Board (CPCB)",
            stationAqi:
              typeof body.data.aqi === "number" && Number.isFinite(body.data.aqi)
                ? body.data.aqi
                : calculateCpcbAqi({ pm25: stationPm25 }).aqi,
            stationPm25,
            attribution: MANDATORY_ATTRIBUTIONS.WAQI,
          };

          globalStationCache.set(cacheKey, reading, CACHE_TTL_MS.STATION);
          return reading;
        }
      }
    } catch {
      // Fall through to OpenAQ
    }
  }

  const openaqKey = process.env.OPENAQ_API_KEY;
  if (openaqKey) {
    try {
      const openaqUrl = `https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=25000&order_by=distance&limit=1`;
      const res = await fetchWithResilience(openaqUrl, {
        provider: "openaq",
        timeoutMs: 3000,
        maxRetries: 1,
        requestInit: {
          headers: { "X-API-Key": openaqKey },
        },
      });

      if (res.ok) {
        const json = JSON.parse(res.bodyText) as {
          results?: Array<{
            id?: number;
            name?: string;
            owner?: { name?: string };
            sensors?: Array<{
              id?: number;
              parameter?: { name?: string };
              value?: number;
            }>;
          }>;
        };

        const loc = json.results?.[0];
        if (loc) {
          const pm25Sensor = loc.sensors?.find(
            (s) => s.parameter?.name?.toLowerCase() === "pm25",
          );
          let stationPm25 =
            typeof pm25Sensor?.value === "number" && Number.isFinite(pm25Sensor.value)
              ? pm25Sensor.value
              : undefined;

          // Real OpenAQ v3 /locations omits latest sensor measurements; fetch /latest when available
          if (stationPm25 === undefined && typeof loc.id === "number") {
            const latestRes = await fetchWithResilience(
              `https://api.openaq.org/v3/locations/${loc.id}/latest`,
              {
                provider: "openaq",
                timeoutMs: 2500,
                maxRetries: 0,
                requestInit: { headers: { "X-API-Key": openaqKey } },
              },
            );
            if (latestRes.ok) {
              const latestJson = JSON.parse(latestRes.bodyText) as {
                results?: Array<{ sensorsId?: number; value?: number }>;
              };
              const matched = latestJson.results?.find(
                (r) =>
                  (pm25Sensor?.id !== undefined && r.sensorsId === pm25Sensor.id) ||
                  typeof r.value === "number",
              );
              if (typeof matched?.value === "number" && Number.isFinite(matched.value)) {
                stationPm25 = matched.value;
              }
            }
          }

          if (stationPm25 !== undefined) {
            const reading: RawStationReading = {
              source: "openaq",
              stationName: loc.name ?? "OpenAQ Regional Station",
              originatingAgency: loc.owner?.name ?? "OpenAQ Contributor",
              stationAqi: calculateCpcbAqi({ pm25: stationPm25 }).aqi,
              stationPm25,
              attribution: MANDATORY_ATTRIBUTIONS.OPENAQ,
            };

            globalStationCache.set(cacheKey, reading, CACHE_TTL_MS.STATION);
            return reading;
          }
        }
      }
    } catch {
      // Fall through cleanly
    }
  }

  return null;
}

/**
 * Backward-compatible Ground Station Skew Check helper.
 */
export async function fetchGroundStationData(
  lat: number,
  lon: number,
  cityModelPm25: number,
): Promise<GroundStationCheck | null> {
  const reading = await fetchRawGroundStation(lat, lon);
  if (!reading) return null;
  return classifyStationSkew(reading, cityModelPm25);
}
