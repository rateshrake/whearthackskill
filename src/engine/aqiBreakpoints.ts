/**
 * VayuShield Deterministic Physics & Index Kernel
 * Module: aqiBreakpoints.ts
 *
 * Implements exact piecewise linear interpolation for:
 * 1. India CPCB National AQI (Sub-indices for PM2.5, PM10, NO2, O3, SO2, CO)
 *    - Cap at 500 per CPCB rules
 *    - Uncapped raw severity flag when PM2.5 > 380 µg/m³
 * 2. US EPA May 2024 Revised AQI
 *    - Tightened 9.0 µg/m³ Good cutoff
 *    - 35.5 - 55.4 µg/m³ Unhealthy for Sensitive Groups band
 * 3. Cross-scale comparison & "Satisfactory Illusion" alert detection
 *
 * All code is 100% pure isomorphic TypeScript with zero dependencies.
 */

export type CpcbCategory =
  "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe";

export type UsEpaCategory =
  | "Good"
  | "Moderate"
  | "Unhealthy for Sensitive Groups"
  | "Unhealthy"
  | "Very Unhealthy"
  | "Hazardous";

export interface ColorBlindSafeToken {
  name: string;
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  label: string;
}

export interface CpcbSubIndexResult {
  pollutant: "PM2.5" | "PM10" | "NO2" | "O3" | "SO2" | "CO";
  concentration: number;
  subIndex: number;
  rawSubIndex: number;
  category: CpcbCategory;
  isCapped: boolean;
  isUncappedRawSeverity: boolean;
}

export interface CpcbAqiResult {
  aqi: number;
  rawAqi: number;
  category: CpcbCategory;
  isCapped: boolean;
  isUncappedRawSeverity: boolean;
  criticalPollutant: "PM2.5" | "PM10" | "NO2" | "O3" | "SO2" | "CO";
  subIndices: Partial<
    Record<"PM2.5" | "PM10" | "NO2" | "O3" | "SO2" | "CO", CpcbSubIndexResult>
  >;
  colorBlindSafeToken: ColorBlindSafeToken;
}

export interface UsEpaAqiResult {
  pollutant: "PM2.5";
  concentration: number;
  aqi: number;
  rawAqi: number;
  category: UsEpaCategory;
  isCapped: boolean;
  isUncappedRawSeverity: boolean;
  colorBlindSafeToken: ColorBlindSafeToken;
}

export interface AqiScaleComparison {
  pm25: number;
  cpcb: CpcbAqiResult;
  usEpa: UsEpaAqiResult;
  satisfactoryIllusionAlert: boolean;
  divergenceDelta: number; // usEpa.aqi - cpcb.aqi
  explanation: string;
}

export interface PollutantConcentrations {
  pm25?: number | undefined;
  pm10?: number | undefined;
  no2?: number | undefined;
  o3?: number | undefined;
  so2?: number | undefined;
  co?: number | undefined;
}

/**
 * Color-blind safe palette mapping using Tol & Okabe-Ito accessible contrast design.
 */
export const COLOR_BLIND_SAFE_TOKENS: Record<
  CpcbCategory | UsEpaCategory,
  ColorBlindSafeToken
> = {
  Good: {
    name: "tol-teal",
    hex: "#009E73",
    bgClass: "bg-emerald-700",
    textClass: "text-emerald-100",
    borderClass: "border-emerald-600",
    label: "Good",
  },
  Satisfactory: {
    name: "tol-sky",
    hex: "#56B4E9",
    bgClass: "bg-sky-700",
    textClass: "text-sky-100",
    borderClass: "border-sky-600",
    label: "Satisfactory",
  },
  Moderate: {
    name: "tol-amber",
    hex: "#E69F00",
    bgClass: "bg-amber-600",
    textClass: "text-amber-100",
    borderClass: "border-amber-500",
    label: "Moderate",
  },
  "Unhealthy for Sensitive Groups": {
    name: "tol-vermilion",
    hex: "#D55E00",
    bgClass: "bg-orange-700",
    textClass: "text-orange-100",
    borderClass: "border-orange-600",
    label: "Unhealthy for Sensitive Groups",
  },
  Poor: {
    name: "tol-orange-burnt",
    hex: "#E66101",
    bgClass: "bg-orange-800",
    textClass: "text-orange-100",
    borderClass: "border-orange-700",
    label: "Poor",
  },
  Unhealthy: {
    name: "tol-magenta",
    hex: "#CC79A7",
    bgClass: "bg-rose-700",
    textClass: "text-rose-100",
    borderClass: "border-rose-600",
    label: "Unhealthy",
  },
  "Very Poor": {
    name: "tol-dark-red",
    hex: "#B2182B",
    bgClass: "bg-red-800",
    textClass: "text-red-100",
    borderClass: "border-red-700",
    label: "Very Poor",
  },
  "Very Unhealthy": {
    name: "tol-violet",
    hex: "#7828C8",
    bgClass: "bg-purple-800",
    textClass: "text-purple-100",
    borderClass: "border-purple-700",
    label: "Very Unhealthy",
  },
  Severe: {
    name: "tol-burgundy",
    hex: "#67001F",
    bgClass: "bg-red-950",
    textClass: "text-red-200",
    borderClass: "border-red-800",
    label: "Severe",
  },
  Hazardous: {
    name: "tol-deep-maroon",
    hex: "#7F0000",
    bgClass: "bg-rose-950",
    textClass: "text-rose-200",
    borderClass: "border-rose-900",
    label: "Hazardous",
  },
};

interface LinearBreakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

/**
 * CPCB Breakpoints Table (CPCB NAQI System, MoEFCC India).
 */
const CPCB_BREAKPOINTS: Record<
  "PM2.5" | "PM10" | "NO2" | "O3" | "SO2" | "CO",
  readonly LinearBreakpoint[]
> = {
  // 24-hr average (µg/m³)
  "PM2.5": [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
    { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
    { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
    { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
    { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
    { cLow: 251, cHigh: 380, iLow: 401, iHigh: 500 },
  ],
  // 24-hr average (µg/m³)
  PM10: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
    { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
    { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
    { cLow: 431, cHigh: 500, iLow: 401, iHigh: 500 },
  ],
  // 24-hr average (µg/m³)
  NO2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
    { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
    { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
    { cLow: 401, cHigh: 800, iLow: 401, iHigh: 500 },
  ],
  // 8-hr average (µg/m³)
  O3: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
    { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
    { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
    { cLow: 749, cHigh: 1000, iLow: 401, iHigh: 500 },
  ],
  // 24-hr average (µg/m³)
  SO2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
    { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
    { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
    { cLow: 1601, cHigh: 2100, iLow: 401, iHigh: 500 },
  ],
  // 8-hr average (mg/m³)
  CO: [
    { cLow: 0.0, cHigh: 1.0, iLow: 0, iHigh: 50 },
    { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
    { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
    { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
    { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
    { cLow: 34.1, cHigh: 50.0, iLow: 401, iHigh: 500 },
  ],
};

/**
 * US EPA May 2024 Revised PM2.5 Breakpoints (40 CFR Part 58, effective May 6, 2024).
 * Reflects lower annual primary standard (9.0 µg/m³) and revised AQI brackets.
 */
const US_EPA_2024_PM25_BREAKPOINTS: readonly LinearBreakpoint[] = [
  { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50 },
  { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200 },
  { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300 },
  { cLow: 225.5, cHigh: 325.4, iLow: 301, iHigh: 400 },
  { cLow: 325.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
];

/**
 * Standard Piecewise Linear Interpolation Formula:
 * I = I_low + ((I_high - I_low) / (C_high - C_low)) * (C - C_low)
 */
function interpolate(c: number, bp: LinearBreakpoint): number {
  return bp.iLow + ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow);
}

function findBreakpoint(c: number, table: readonly LinearBreakpoint[]): LinearBreakpoint {
  return table.find((bp) => c <= bp.cHigh) ?? table[table.length - 1]!;
}

/**
 * Classifies CPCB AQI value into official health categories.
 */
export function classifyCpcbAqi(aqi: number): CpcbCategory {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

/**
 * Classifies US EPA AQI value into official health categories.
 */
export function classifyUsEpaAqi(aqi: number): UsEpaCategory {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

/**
 * Calculates CPCB Sub-Index for a single pollutant.
 * Handles integer and continuous boundaries per CPCB rules.
 */
export function calculateCpcbSubIndex(
  pollutant: "PM2.5" | "PM10" | "NO2" | "O3" | "SO2" | "CO",
  concentration: number,
): CpcbSubIndexResult {
  const c = Math.max(0, concentration);
  const table = CPCB_BREAKPOINTS[pollutant];
  const topBp = table[table.length - 1]!;

  let rawSubIndex = 0;
  let isCapped = false;
  let isUncappedRawSeverity = false;

  if (c > topBp.cHigh) {
    rawSubIndex = interpolate(c, topBp);
    isCapped = true;
    if (pollutant === "PM2.5" && c > 380) {
      isUncappedRawSeverity = true;
    }
  } else {
    const matchedBp = findBreakpoint(c, table);
    rawSubIndex = interpolate(c, matchedBp);
  }

  const roundedRaw = Math.round(rawSubIndex);
  const subIndex = Math.min(500, Math.max(0, roundedRaw));
  if (roundedRaw > 500) {
    isCapped = true;
  }

  const category = classifyCpcbAqi(subIndex);

  return {
    pollutant,
    concentration: c,
    subIndex,
    rawSubIndex: roundedRaw,
    category,
    isCapped,
    isUncappedRawSeverity,
  };
}

/**
 * Calculates India CPCB National AQI from multiple pollutant concentrations.
 * Overall AQI is the maximum of all valid sub-indices.
 */
export function calculateCpcbAqi(concentrations: PollutantConcentrations): CpcbAqiResult {
  const subIndices: Partial<
    Record<"PM2.5" | "PM10" | "NO2" | "O3" | "SO2" | "CO", CpcbSubIndexResult>
  > = {};

  let maxSubIndex = 0;
  let maxRawAqi = 0;
  let criticalPollutant: "PM2.5" | "PM10" | "NO2" | "O3" | "SO2" | "CO" = "PM2.5";
  let hasCapped = false;
  let hasUncappedRawSeverity = false;

  const pollutantEntries: Array<
    ["PM2.5" | "PM10" | "NO2" | "O3" | "SO2" | "CO", number | undefined]
  > = [
    ["PM2.5", concentrations.pm25],
    ["PM10", concentrations.pm10],
    ["NO2", concentrations.no2],
    ["O3", concentrations.o3],
    ["SO2", concentrations.so2],
    ["CO", concentrations.co],
  ];

  for (const [key, val] of pollutantEntries) {
    if (val !== undefined && !Number.isNaN(val)) {
      const res = calculateCpcbSubIndex(key, val);
      subIndices[key] = res;

      if (res.subIndex >= maxSubIndex) {
        maxSubIndex = res.subIndex;
        maxRawAqi = res.rawSubIndex;
        criticalPollutant = key;
      }
      if (res.isCapped) hasCapped = true;
      if (res.isUncappedRawSeverity) hasUncappedRawSeverity = true;
    }
  }

  const category = classifyCpcbAqi(maxSubIndex);

  return {
    aqi: maxSubIndex,
    rawAqi: maxRawAqi,
    category,
    isCapped: hasCapped,
    isUncappedRawSeverity: hasUncappedRawSeverity,
    criticalPollutant,
    subIndices,
    colorBlindSafeToken: COLOR_BLIND_SAFE_TOKENS[category],
  };
}

/**
 * Calculates US EPA May 2024 Revised AQI for PM2.5.
 */
export function calculateUsEpa2024Pm25Aqi(pm25: number): UsEpaAqiResult {
  const c = Math.max(0, pm25);
  const table = US_EPA_2024_PM25_BREAKPOINTS;
  const topBp = table[table.length - 1]!;

  let rawAqi = 0;
  let isCapped = false;
  let isUncappedRawSeverity = false;

  if (c > topBp.cHigh) {
    rawAqi = interpolate(c, topBp);
    isCapped = true;
    isUncappedRawSeverity = true;
  } else {
    const matchedBp = findBreakpoint(c, table);
    rawAqi = interpolate(c, matchedBp);
  }

  const roundedRaw = Math.round(rawAqi);
  const aqi = Math.min(500, Math.max(0, roundedRaw));
  if (roundedRaw > 500) {
    isCapped = true;
    isUncappedRawSeverity = true;
  }

  const category = classifyUsEpaAqi(aqi);

  return {
    pollutant: "PM2.5",
    concentration: c,
    aqi,
    rawAqi: roundedRaw,
    category,
    isCapped,
    isUncappedRawSeverity,
    colorBlindSafeToken: COLOR_BLIND_SAFE_TOKENS[category],
  };
}

/**
 * Compares CPCB and US EPA 2024 scales for a given PM2.5 concentration.
 * Detects the "Satisfactory Illusion" where CPCB reports "Good" or "Satisfactory"
 * while US EPA classifies the air as "Unhealthy for Sensitive Groups" or worse.
 */
export function compareAqiScales(pm25: number): AqiScaleComparison {
  const cpcbResult = calculateCpcbAqi({ pm25 });
  const epaResult = calculateUsEpa2024Pm25Aqi(pm25);

  const isCpcbMild =
    cpcbResult.category === "Good" || cpcbResult.category === "Satisfactory";
  const isEpaHarmful =
    epaResult.category === "Unhealthy for Sensitive Groups" ||
    epaResult.category === "Unhealthy" ||
    epaResult.category === "Very Unhealthy" ||
    epaResult.category === "Hazardous";

  const satisfactoryIllusionAlert = isCpcbMild && isEpaHarmful;
  const divergenceDelta = epaResult.aqi - cpcbResult.aqi;

  let explanation: string;
  if (satisfactoryIllusionAlert) {
    explanation =
      `CRITICAL ALERT: "Satisfactory Illusion" detected at ${pm25.toFixed(1)} µg/m³. ` +
      `Indian CPCB rates this as "${cpcbResult.category}" (AQI ${cpcbResult.aqi}), but revised US EPA 2024 standards ` +
      `classify it as "${epaResult.category}" (AQI ${epaResult.aqi}). Sensitive groups (asthmatic children, elders) ` +
      `face active respiratory health risks despite local benign classification.`;
  } else if (divergenceDelta > 0) {
    explanation = `US EPA index is ${divergenceDelta} points more conservative than CPCB due to stricter epidemiological thresholds.`;
  } else if (divergenceDelta < 0) {
    explanation = `CPCB index is ${Math.abs(divergenceDelta)} points higher in this severe tier due to steep linear sub-index slopes above 250 µg/m³.`;
  } else {
    explanation = `Both indices converge at this concentration level.`;
  }

  return {
    pm25,
    cpcb: cpcbResult,
    usEpa: epaResult,
    satisfactoryIllusionAlert,
    divergenceDelta,
    explanation,
  };
}
