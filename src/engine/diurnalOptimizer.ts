/**
 * VayuShield Deterministic Physics & Index Kernel
 * Module: diurnalOptimizer.ts
 *
 * Implements:
 * 1. Optical PM sensor hygroscopic growth correction for RH > 75%
 * 2. Rolling 2-hour average exposure window analysis across 48-hour diurnal cycle
 * 3. Identification of cleanest vs. peak worst 2-hour outdoor exposure windows (today & tomorrow)
 * 4. Respiratory deposition and inhaled dose modeling across household archetypes:
 *    - child_asthma (12 L/min)
 *    - older_adult_walker (18 L/min)
 *    - office_commuter (20 L/min)
 *    - general_adult (15 L/min)
 *
 * 100% pure isomorphic TypeScript with zero dependencies.
 */

export interface DiurnalObservation {
  timestampIso: string;
  pm25: number;
  pm10: number;
  humidityPct?: number | undefined;
}

export interface ProcessedObservation {
  timestampIso: string;
  rawPm25: number;
  adjustedPm25: number;
  rawPm10: number;
  humidityPct?: number | undefined;
  wasHumidityAdjusted: boolean;
  hygroscopicFactor: number;
}

export interface ExposureWindow {
  startTimeIso: string;
  endTimeIso: string;
  day: "today" | "tomorrow";
  averagePm25: number;
  rawAveragePm25: number;
  averagePm10: number;
  wasHumidityAdjusted: boolean;
  sampleCount: number;
}

export type HouseholdArchetype =
  "child_asthma" | "older_adult_walker" | "office_commuter" | "general_adult";

export interface ArchetypeProfile {
  id: HouseholdArchetype;
  label: string;
  minuteVentilationLpm: number; // L/min (Minute ventilation rate V_E)
  description: string;
  vulnerabilityTier: "high" | "moderate" | "standard";
}

export const HOUSEHOLD_ARCHETYPES: Record<HouseholdArchetype, ArchetypeProfile> = {
  child_asthma: {
    id: "child_asthma",
    label: "Child with Asthma",
    minuteVentilationLpm: 12.0, // EPA Child Exposure Factors Handbook (moderate active)
    description:
      "Pediatric physiology with hyper-reactive airway responsiveness and higher lung surface-to-body-mass ratio.",
    vulnerabilityTier: "high",
  },
  older_adult_walker: {
    id: "older_adult_walker",
    label: "Older Adult (Morning Walker)",
    minuteVentilationLpm: 18.0, // EPA Older Adult Light-to-Moderate Physical Activity (Walking ~3-4 km/h)
    description:
      "Cardiovascular and cerebrovascular vulnerability; reduced ciliary clearance efficiency.",
    vulnerabilityTier: "high",
  },
  office_commuter: {
    id: "office_commuter",
    label: "Office Commuter",
    minuteVentilationLpm: 20.0, // Brisk commute, stairs, public transit transition
    description:
      "Peak-hour transit exposure; elevated breathing frequency during brisk walking.",
    vulnerabilityTier: "moderate",
  },
  general_adult: {
    id: "general_adult",
    label: "General Adult",
    minuteVentilationLpm: 15.0, // Standard adult baseline moderate daily activity
    description: "Standard adult respiratory reference value for outdoor activities.",
    vulnerabilityTier: "standard",
  },
};

export interface DiurnalOptimizationResult {
  windows: ExposureWindow[];
  cleanestToday: ExposureWindow | null;
  worstToday: ExposureWindow | null;
  cleanestTomorrow: ExposureWindow | null;
  worstTomorrow: ExposureWindow | null;
  humidityAdjustmentCount: number;
}

export interface RespiratoryDoseComparison {
  archetype: HouseholdArchetype;
  minuteVentilationLpm: number;
  activityDurationMinutes: number;
  inhaledAirVolumeM3: number;
  baselineWindow: ExposureWindow;
  shiftedWindow: ExposureWindow;
  baselineDoseUg: number;
  shiftedDoseUg: number;
  reductionUg: number;
  percentReduction: number;
  clinicalSignificance: string;
}

/**
 * Optical Particle Counter (OPC) Hygroscopic Growth Correction.
 *
 * In low-cost nephelometers and light-scattering sensors (e.g. Plantower, Sensirion),
 * relative humidity above 75% causes deliquescence and hygroscopic swelling of aerosols.
 * Empirical particle growth factor:
 * CF(RH) = 1 + kappa * ((RH/100)^2 / (1 - (RH/100)))
 * where kappa = 0.25 (standard continental aerosol hygroscopic parameter).
 */
export function correctOpticalHygroscopicGrowth(
  pm25: number,
  humidityPct?: number | undefined,
): { adjustedPm25: number; wasAdjusted: boolean; hygroscopicFactor: number } {
  if (humidityPct === undefined || humidityPct <= 75 || humidityPct >= 100) {
    return {
      adjustedPm25: pm25,
      wasAdjusted: false,
      hygroscopicFactor: 1.0,
    };
  }

  const rh = humidityPct / 100;
  const kappa = 0.25;
  const hygroscopicFactor = 1.0 + kappa * ((rh * rh) / (1.0 - rh));
  const adjustedPm25 = Number((pm25 / hygroscopicFactor).toFixed(2));

  return {
    adjustedPm25,
    wasAdjusted: true,
    hygroscopicFactor: Number(hygroscopicFactor.toFixed(3)),
  };
}

/**
 * Prepares raw 48-hour diurnal observations with humidity correction.
 */
export function processDiurnalObservations(
  observations: readonly DiurnalObservation[],
  applyHumidityCorrection = true,
): ProcessedObservation[] {
  return observations.map((obs) => {
    const correction =
      applyHumidityCorrection && obs.humidityPct !== undefined
        ? correctOpticalHygroscopicGrowth(obs.pm25, obs.humidityPct)
        : {
            adjustedPm25: obs.pm25,
            wasAdjusted: false,
            hygroscopicFactor: 1.0,
          };

    return {
      timestampIso: obs.timestampIso,
      rawPm25: obs.pm25,
      adjustedPm25: correction.adjustedPm25,
      rawPm10: obs.pm10,
      ...(obs.humidityPct !== undefined ? { humidityPct: obs.humidityPct } : {}),
      wasHumidityAdjusted: correction.wasAdjusted,
      hygroscopicFactor: correction.hygroscopicFactor,
    };
  });
}

/**
 * Computes rolling 2-hour average exposure windows across a 48-hour time series.
 * Groups windows into "today" (first 24h) and "tomorrow" (next 24h).
 */
export function computeRollingDiurnalWindows(
  observations: readonly DiurnalObservation[],
  options: { applyHumidityCorrection?: boolean | undefined } = {},
): DiurnalOptimizationResult {
  if (observations.length === 0) {
    return {
      windows: [],
      cleanestToday: null,
      worstToday: null,
      cleanestTomorrow: null,
      worstTomorrow: null,
      humidityAdjustmentCount: 0,
    };
  }

  const applyCorrection = options.applyHumidityCorrection ?? true;
  const processed = processDiurnalObservations(observations, applyCorrection);

  let humidityAdjustmentCount = 0;
  for (const obs of processed) {
    if (obs.wasHumidityAdjusted) {
      humidityAdjustmentCount++;
    }
  }

  // Determine split point for today vs tomorrow based on timestamp or index
  const baseTime = new Date(processed[0]?.timestampIso ?? 0).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const windows: ExposureWindow[] = [];

  // Rolling 2-hour windows (spanning observations within [t, t + 2h])
  for (let i = 0; i < processed.length - 1; i++) {
    const current = processed[i];
    if (!current) continue;

    const tCurrent = new Date(current.timestampIso).getTime();
    const windowPoints: ProcessedObservation[] = [];

    for (let j = i; j < processed.length; j++) {
      const pt = processed[j]!;
      const ptTime = new Date(pt.timestampIso).getTime();
      const diffHours = (ptTime - tCurrent) / (1000 * 60 * 60);
      if (diffHours <= 2.05) {
        windowPoints.push(pt);
      } else {
        break;
      }
    }

    if (windowPoints.length < 2) continue;

    const lastPoint = windowPoints[windowPoints.length - 1];
    const endTimeIso = lastPoint ? lastPoint.timestampIso : current.timestampIso;

    let sumAdjustedPm25 = 0;
    let sumRawPm25 = 0;
    let sumPm10 = 0;
    let wasAdjustedInWindow = false;

    for (const pt of windowPoints) {
      sumAdjustedPm25 += pt.adjustedPm25;
      sumRawPm25 += pt.rawPm25;
      sumPm10 += pt.rawPm10;
      if (pt.wasHumidityAdjusted) {
        wasAdjustedInWindow = true;
      }
    }

    const sampleCount = windowPoints.length;
    const avgAdjustedPm25 = Number((sumAdjustedPm25 / sampleCount).toFixed(2));
    const avgRawPm25 = Number((sumRawPm25 / sampleCount).toFixed(2));
    const avgPm10 = Number((sumPm10 / sampleCount).toFixed(2));

    const windowStartTime = new Date(current.timestampIso).getTime();
    const dayTag: "today" | "tomorrow" =
      windowStartTime - baseTime < dayMs ? "today" : "tomorrow";

    windows.push({
      startTimeIso: current.timestampIso,
      endTimeIso,
      day: dayTag,
      averagePm25: avgAdjustedPm25,
      rawAveragePm25: avgRawPm25,
      averagePm10: avgPm10,
      wasHumidityAdjusted: wasAdjustedInWindow,
      sampleCount,
    });
  }

  // Find extremes for today and tomorrow
  const todayWindows = windows.filter((w) => w.day === "today");
  const tomorrowWindows = windows.filter((w) => w.day === "tomorrow");

  const findExtremes = (
    list: readonly ExposureWindow[],
  ): { cleanest: ExposureWindow | null; worst: ExposureWindow | null } => {
    if (list.length === 0) return { cleanest: null, worst: null };
    let cleanest: ExposureWindow = list[0]!;
    let worst: ExposureWindow = list[0]!;

    for (let k = 1; k < list.length; k++) {
      const w = list[k]!;
      if (w.averagePm25 < cleanest.averagePm25) {
        cleanest = w;
      } else if (w.averagePm25 > worst.averagePm25) {
        worst = w;
      }
    }
    return { cleanest, worst };
  };

  const todayExtremes = findExtremes(todayWindows);
  const tomorrowExtremes = findExtremes(tomorrowWindows);

  return {
    windows,
    cleanestToday: todayExtremes.cleanest,
    worstToday: todayExtremes.worst,
    cleanestTomorrow: tomorrowExtremes.cleanest,
    worstTomorrow: tomorrowExtremes.worst,
    humidityAdjustmentCount,
  };
}

/**
 * Calculates Respiratory Dose (inhaled mass in µg) and compares
 * baseline (peak/worst) exposure window against shifted (cleanest) window.
 *
 * Formula:
 * Inhaled Air Volume (m³) = V_E (L/min) * Duration (min) * 10^-3 (m³/L)
 * Inhaled Dose (µg) = Concentration (µg/m³) * Inhaled Air Volume (m³)
 */
export function calculateRespiratoryDose(
  baselineWindow: ExposureWindow,
  shiftedWindow: ExposureWindow,
  archetype: HouseholdArchetype,
  durationMinutes = 120, // 2-hour window default
): RespiratoryDoseComparison {
  const profile = HOUSEHOLD_ARCHETYPES[archetype];
  const veLpm = profile.minuteVentilationLpm;

  // Inhaled air volume in m³
  const inhaledAirVolumeM3 = (veLpm * durationMinutes) / 1000;

  const baselineDoseUg = Number(
    (baselineWindow.averagePm25 * inhaledAirVolumeM3).toFixed(2),
  );
  const shiftedDoseUg = Number(
    (shiftedWindow.averagePm25 * inhaledAirVolumeM3).toFixed(2),
  );

  const reductionUg = Number((baselineDoseUg - shiftedDoseUg).toFixed(2));
  const percentReduction =
    baselineDoseUg > 0
      ? Number((((baselineDoseUg - shiftedDoseUg) / baselineDoseUg) * 100).toFixed(1))
      : 0;

  let clinicalSignificance: string;
  if (percentReduction >= 50) {
    clinicalSignificance = `Exceptional: ${percentReduction}% reduction protects ${profile.label} by avoiding ${reductionUg} µg of pulmonary PM2.5 deposition.`;
  } else if (percentReduction >= 25) {
    clinicalSignificance = `Clinically Significant: ${percentReduction}% reduction (${reductionUg} µg spared) noticeably lowers systemic inflammatory stimulus.`;
  } else {
    clinicalSignificance = `Moderate: ${percentReduction}% reduction (${reductionUg} µg spared) during diurnal shift.`;
  }

  return {
    archetype,
    minuteVentilationLpm: veLpm,
    activityDurationMinutes: durationMinutes,
    inhaledAirVolumeM3: Number(inhaledAirVolumeM3.toFixed(3)),
    baselineWindow,
    shiftedWindow,
    baselineDoseUg,
    shiftedDoseUg,
    reductionUg,
    percentReduction,
    clinicalSignificance,
  };
}
