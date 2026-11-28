/**
 * VayuShield Backend Services
 * Module: attributions.ts
 *
 * Leaf module holding mandatory data attributions and shared meteorological defaults
 * to prevent circular dependencies between airQualityAggregator and provider adapters.
 */

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

export const DEFAULT_REGIONAL_WIND = {
  speedKmh: 12.0,
  directionDeg: 315.0, // Default NW winter corridor
} as const;
