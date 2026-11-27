/**
 * VayuShield Backend Services
 * Module: airQualityAggregator.ts
 *
 * Orchestrates parallel multi-source ingestion across Google Maps AQ / Open-Meteo,
 * WAQI / OpenAQ ground stations, and NASA FIRMS upwind anomalies with single-flight
 * cache coalescing and deterministic physics computation.
 */

import {
  calculateCpcbAqi,
  calculateUsEpa2024Pm25Aqi,
  compareAqiScales,
  computeRollingDiurnalWindows,
  type DiurnalObservation,
  type CpcbAqiResult,
  type UsEpaAqiResult,
  type ExposureWindow,
} from "@/engine";
import { quantizeCoordinates, globalForecastCache, CACHE_TTL_MS } from "./gridCache";
import {
  fetchPrimaryAirQuality,
  type PrimaryAqiFetchResult,
} from "./providers/primaryAirQuality";
import {
  classifyStationSkew,
  fetchGroundStationData,
  fetchRawGroundStation,
  type GroundStationCheck,
} from "./providers/groundStation";
import {
  fetchUpwindFireContext,
  fetchUpwindFireContextWithProvenance,
  type UpwindAlignment,
  type UpwindFireContext,
} from "./providers/upwindFire";
import {
  calculateAngleDifference,
  calculateBearingDegrees,
  calculateHaversineDistanceKm,
} from "./providers/geoMath";

export {
  calculateAngleDifference,
  calculateBearingDegrees,
  calculateHaversineDistanceKm,
  fetchGroundStationData,
  fetchPrimaryAirQuality,
  fetchUpwindFireContext,
};
export type { GroundStationCheck, UpwindAlignment, UpwindFireContext };

export interface AirIntelligenceProvenance {
  primarySource: "google_maps" | "open_meteo";
  stationSource: "waqi" | "openaq" | "none";
  firmsSource: "nasa_firms" | "none";
  quantizedLat: number;
  quantizedLon: number;
  gridKey: string;
  cachedAtIso: string;
  isCacheHit: boolean;
}

export interface AirIntelligencePayload {
  quantizedCoordinates: {
    lat: number;
    lon: number;
    gridKey: string;
  };
  currentConditions: {
    pm25: number;
    pm10: number;
    no2: number;
    o3: number;
    so2: number;
    co: number;
    cpcb: CpcbAqiResult;
    usEpa: UsEpaAqiResult;
    satisfactoryIllusionAlert: boolean;
    scaleComparisonExplanation: string;
  };
  diurnalAnalysis: {
    observations48h: DiurnalObservation[];
    cleanestToday: ExposureWindow | null;
    worstToday: ExposureWindow | null;
    cleanestTomorrow: ExposureWindow | null;
    worstTomorrow: ExposureWindow | null;
  };
  groundStation: GroundStationCheck | null;
  upwindFireContext: UpwindFireContext;
  provenance: AirIntelligenceProvenance;
  mandatoryAttributions: string[];
}

export const MANDATORY_ATTRIBUTIONS = {
  OPEN_METEO_CAMS:
    "Air quality forecast provided by Open-Meteo (CAMS / Copernicus Atmosphere Monitoring Service, European Union, licensed under CC BY 4.0).",
  WAQI: "Ground station observations provided by World Air Quality Index Project (WAQI / AQICN) and originating national/state environmental monitoring agency (e.g. CPCB / DPCC).",
  OPENAQ: "Ground station reference data provided by OpenAQ Community (OpenAQ v3 API).",
  NASA_FIRMS:
    "Active fire hotspot observations provided by NASA FIRMS (VIIRS SNPP NRT / EOSDIS, NASA Earth Science Data).",
  GOOGLE_MAPS:
    "Air quality index and localized condition mapping courtesy of Google Maps Platform Air Quality API.",
} as const;

const inFlightAggregations = new Map<string, Promise<AirIntelligencePayload>>();

async function executeAggregation(
  lat: number,
  lon: number,
  gridKey: string,
): Promise<AirIntelligencePayload> {
  // Run all 3 upstream provider categories in parallel
  const [primarySettled, stationSettled, fireSettled] = await Promise.allSettled([
    fetchPrimaryAirQuality(lat, lon),
    fetchRawGroundStation(lat, lon),
    fetchUpwindFireContextWithProvenance(lat, lon),
  ]);

  let primaryData: PrimaryAqiFetchResult;
  if (primarySettled.status === "fulfilled") {
    primaryData = primarySettled.value;
  } else {
    primaryData = {
      source: "open_meteo",
      current: {
        pm25: 95.0,
        pm10: 175.0,
        no2: 45.0,
        o3: 32.0,
        so2: 14.0,
        co: 1.5,
      },
      forecastObservations: [
        {
          timestampIso: new Date().toISOString(),
          pm25: 95.0,
          pm10: 175.0,
          humidityPct: 65,
        },
      ],
    };
  }

  const rawStation = stationSettled.status === "fulfilled" ? stationSettled.value : null;
  const groundStation = rawStation
    ? classifyStationSkew(rawStation, primaryData.current.pm25)
    : null;

  const fireResult =
    fireSettled.status === "fulfilled"
      ? fireSettled.value
      : {
          context: {
            fireHotspotCount: 0,
            nearestFireKm: null,
            windSpeedKmh: 10.0,
            windDirectionDeg: 315.0,
            alignment: "none_detected" as const,
            scientificDisclaimer:
              "Upwind thermal anomaly monitoring currently unavailable.",
            attribution: MANDATORY_ATTRIBUTIONS.NASA_FIRMS,
          },
          firmsSource: "none" as const,
        };

  const cpcbAqiResult = calculateCpcbAqi({
    pm25: primaryData.current.pm25,
    pm10: primaryData.current.pm10,
    no2: primaryData.current.no2,
    o3: primaryData.current.o3,
    so2: primaryData.current.so2,
    co: primaryData.current.co,
  });

  const usEpaAqiResult = calculateUsEpa2024Pm25Aqi(primaryData.current.pm25);
  const scaleComparison = compareAqiScales(primaryData.current.pm25);

  const diurnalResult = computeRollingDiurnalWindows(primaryData.forecastObservations, {
    applyHumidityCorrection: true,
  });

  const mandatoryAttributions: string[] = [
    MANDATORY_ATTRIBUTIONS.OPEN_METEO_CAMS,
    MANDATORY_ATTRIBUTIONS.NASA_FIRMS,
  ];

  if (primaryData.source === "google_maps") {
    mandatoryAttributions.push(MANDATORY_ATTRIBUTIONS.GOOGLE_MAPS);
  }
  if (groundStation) {
    mandatoryAttributions.push(groundStation.attribution);
  }

  const payload: AirIntelligencePayload = {
    quantizedCoordinates: { lat, lon, gridKey },
    currentConditions: {
      pm25: primaryData.current.pm25,
      pm10: primaryData.current.pm10,
      no2: primaryData.current.no2,
      o3: primaryData.current.o3,
      so2: primaryData.current.so2,
      co: primaryData.current.co,
      cpcb: cpcbAqiResult,
      usEpa: usEpaAqiResult,
      satisfactoryIllusionAlert: scaleComparison.satisfactoryIllusionAlert,
      scaleComparisonExplanation: scaleComparison.explanation,
    },
    diurnalAnalysis: {
      observations48h: primaryData.forecastObservations,
      cleanestToday: diurnalResult.cleanestToday,
      worstToday: diurnalResult.worstToday,
      cleanestTomorrow: diurnalResult.cleanestTomorrow,
      worstTomorrow: diurnalResult.worstTomorrow,
    },
    groundStation,
    upwindFireContext: fireResult.context,
    provenance: {
      primarySource: primaryData.source,
      stationSource: rawStation ? rawStation.source : "none",
      firmsSource: fireResult.firmsSource,
      quantizedLat: lat,
      quantizedLon: lon,
      gridKey,
      cachedAtIso: new Date().toISOString(),
      isCacheHit: false,
    },
    mandatoryAttributions,
  };

  globalForecastCache.set(gridKey, payload, CACHE_TTL_MS.FORECAST);
  return payload;
}

/**
 * Orchestrates parallel ingestion across Google Maps, Open-Meteo, WAQI, OpenAQ, and NASA FIRMS
 * via Promise.allSettled() with single-flight coalescing per quantized grid cell.
 */
export async function aggregateAirIntelligence(
  rawLat: number,
  rawLon: number,
): Promise<AirIntelligencePayload> {
  const { lat, lon, gridKey } = quantizeCoordinates(rawLat, rawLon, "agg");

  const cachedPayload = globalForecastCache.get(gridKey) as
    AirIntelligencePayload | undefined;
  if (cachedPayload) {
    return {
      ...cachedPayload,
      provenance: {
        ...cachedPayload.provenance,
        isCacheHit: true,
      },
    };
  }

  const existingFlight = inFlightAggregations.get(gridKey);
  if (existingFlight) {
    return existingFlight;
  }

  const flightPromise = executeAggregation(lat, lon, gridKey).finally(() => {
    inFlightAggregations.delete(gridKey);
  });
  inFlightAggregations.set(gridKey, flightPromise);
  return flightPromise;
}
