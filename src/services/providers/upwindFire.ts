/**
 * VayuShield Backend Services — Provider Adapter
 * Module: upwindFire.ts
 *
 * Upwind fire alignment via NASA FIRMS (VIIRS SNPP NRT) + Open-Meteo wind vectors.
 */

import { CACHE_TTL_MS, globalFirmsCache } from "../gridCache";
import { fetchWithResilience } from "../resilientHttp";
import {
  calculateAngleDifference,
  calculateBearingDegrees,
  calculateHaversineDistanceKm,
} from "./geoMath";
import { MANDATORY_ATTRIBUTIONS } from "../airQualityAggregator";

export type UpwindAlignment = "upwind_aligned" | "crosswind" | "none_detected";

export interface UpwindFireContext {
  fireHotspotCount: number;
  nearestFireKm: number | null;
  windSpeedKmh: number;
  windDirectionDeg: number;
  alignment: UpwindAlignment;
  scientificDisclaimer: string;
  attribution: string;
}

export interface UpwindFireQueryResult {
  context: UpwindFireContext;
  firmsSource: "nasa_firms" | "none";
}

function parseFirmsCsvPoints(csvText: string): Array<{ lat: number; lon: number }> {
  const lines = csvText
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const headerCols = lines[0]!.split(",").map((col) => col.trim().toLowerCase());
  const latIdx = headerCols.indexOf("latitude");
  const lonIdx = headerCols.indexOf("longitude");
  const resolvedLatIdx = latIdx >= 0 ? latIdx : 0;
  const resolvedLonIdx = lonIdx >= 0 ? lonIdx : 1;

  const firePoints: Array<{ lat: number; lon: number }> = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]!.split(",");
    const fLat = Number.parseFloat(parts[resolvedLatIdx] ?? "");
    const fLon = Number.parseFloat(parts[resolvedLonIdx] ?? "");
    if (
      Number.isFinite(fLat) &&
      Number.isFinite(fLon) &&
      fLat >= -90 &&
      fLat <= 90 &&
      fLon >= -180 &&
      fLon <= 180
    ) {
      firePoints.push({ lat: fLat, lon: fLon });
    }
  }

  return firePoints;
}

function isCachedFireResult(value: unknown): value is UpwindFireQueryResult {
  return (
    value !== null &&
    typeof value === "object" &&
    "context" in value &&
    "firmsSource" in value
  );
}

/**
 * Fetches wind vector and regional NASA FIRMS anomalies with explicit source provenance.
 */
export async function fetchUpwindFireContextWithProvenance(
  lat: number,
  lon: number,
): Promise<UpwindFireQueryResult> {
  const cacheKey = `firms:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = globalFirmsCache.get(cacheKey);
  if (isCachedFireResult(cached)) {
    return cached;
  }

  let windSpeedKmh = 12.0;
  let windDirectionDeg = 315.0; // Default NW winter corridor

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m`;
    const wRes = await fetchWithResilience(weatherUrl, {
      provider: "open_meteo_weather",
      timeoutMs: 3000,
      maxRetries: 1,
    });
    if (wRes.ok) {
      const wData = JSON.parse(wRes.bodyText) as {
        current?: {
          wind_speed_10m?: number;
          wind_direction_10m?: number;
        };
      };
      if (wData.current) {
        if (
          typeof wData.current.wind_speed_10m === "number" &&
          Number.isFinite(wData.current.wind_speed_10m)
        ) {
          windSpeedKmh = wData.current.wind_speed_10m;
        }
        if (
          typeof wData.current.wind_direction_10m === "number" &&
          Number.isFinite(wData.current.wind_direction_10m)
        ) {
          windDirectionDeg = wData.current.wind_direction_10m;
        }
      }
    }
  } catch {
    // Continue with default regional wind vector
  }

  const firmsMapKey = process.env.NASA_FIRMS_MAP_KEY;
  let fireHotspotCount = 0;
  let nearestFireKm: number | null = null;
  let alignment: UpwindAlignment = "none_detected";
  let firmsSource: "nasa_firms" | "none" = "none";

  if (firmsMapKey) {
    try {
      const minLon = Math.max(-180, lon - 1.5).toFixed(2);
      const minLat = Math.max(-90, lat - 1.5).toFixed(2);
      const maxLon = Math.min(180, lon + 1.5).toFixed(2);
      const maxLat = Math.min(90, lat + 1.5).toFixed(2);
      const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;

      const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(firmsMapKey)}/VIIRS_SNPP_NRT/${bbox}/2`;
      const fRes = await fetchWithResilience(firmsUrl, {
        provider: "nasa_firms",
        timeoutMs: 3500,
        maxBytes: 2 * 1024 * 1024,
        maxRetries: 1,
      });

      if (fRes.ok) {
        firmsSource = "nasa_firms";
        const firePoints = parseFirmsCsvPoints(fRes.bodyText);
        fireHotspotCount = firePoints.length;

        if (firePoints.length > 0) {
          let minDistance = Infinity;
          let alignedFireCount = 0;
          let crosswindFireCount = 0;

          for (const fp of firePoints) {
            const distanceKm = calculateHaversineDistanceKm(lat, lon, fp.lat, fp.lon);
            if (distanceKm < minDistance) {
              minDistance = distanceKm;
            }

            const bearingUserToFire = calculateBearingDegrees(lat, lon, fp.lat, fp.lon);
            const angleDiff = calculateAngleDifference(
              windDirectionDeg,
              bearingUserToFire,
            );

            if (angleDiff <= 45.0 && distanceKm <= 200.0 && windSpeedKmh >= 5.0) {
              alignedFireCount++;
            } else if (angleDiff > 45.0 && angleDiff <= 135.0 && distanceKm <= 250.0) {
              crosswindFireCount++;
            }
          }

          nearestFireKm = minDistance !== Infinity ? minDistance : null;

          if (alignedFireCount > 0) {
            alignment = "upwind_aligned";
          } else if (crosswindFireCount > 0) {
            alignment = "crosswind";
          }
        }
      }
    } catch {
      firmsSource = "none";
    }
  }

  const context: UpwindFireContext = {
    fireHotspotCount,
    nearestFireKm,
    windSpeedKmh,
    windDirectionDeg,
    alignment,
    scientificDisclaimer:
      "Active fire detections indicate regional agricultural or biomass thermal anomalies. Correlation with local air quality depends on planetary boundary layer height, nocturnal thermal inversion trapping, and atmospheric dispersion without implying single-source deterministic causation.",
    attribution: MANDATORY_ATTRIBUTIONS.NASA_FIRMS,
  };

  const wrapped: UpwindFireQueryResult = { context, firmsSource };
  globalFirmsCache.set(cacheKey, wrapped, CACHE_TTL_MS.FIRMS);
  return wrapped;
}

/**
 * Backward-compatible Upwind Fire Context helper.
 */
export async function fetchUpwindFireContext(
  lat: number,
  lon: number,
): Promise<UpwindFireContext> {
  const result = await fetchUpwindFireContextWithProvenance(lat, lon);
  return result.context;
}
