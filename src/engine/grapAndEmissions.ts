/**
 * VayuShield Deterministic Physics & Index Kernel
 * Module: grapAndEmissions.ts
 *
 * Implements:
 * 1. Delhi-NCR Graded Response Action Plan (GRAP) mapping:
 *    - Stage I: Poor (AQI 201–300)
 *    - Stage II: Very Poor (AQI 301–400)
 *    - Stage III: Severe (AQI 401–450)
 *    - Stage IV: Severe+ (AQI > 450)
 *    - Structured citizen and RWA action checklists
 * 2. Commute Emission & Personal Inhaled PM2.5 Exposure Deltas:
 *    - private_petrol_car, two_wheeler, metro_transit, work_from_home
 *    - Grams of CO2 and µg PM2.5 inhaled per round-trip km
 *
 * 100% pure isomorphic TypeScript with zero dependencies.
 */

export type GrapStageId = "stage_0" | "stage_1" | "stage_2" | "stage_3" | "stage_4";

export interface GrapChecklistItem {
  id: string;
  category: "citizen" | "rwa" | "regulatory";
  mandatory: boolean;
  action: string;
  rationale: string;
}

export interface GrapStageDetails {
  stage: GrapStageId;
  stageName: string;
  cpcbAqiRange: string;
  minAqi: number;
  maxAqi: number | null;
  severityLabel: string;
  colorHex: string;
  statutoryRestrictions: string[];
  citizenChecklist: GrapChecklistItem[];
  rwaChecklist: GrapChecklistItem[];
}

export type CommuteMode =
  "private_petrol_car" | "two_wheeler" | "metro_transit" | "work_from_home";

export interface CommuteModeProfile {
  id: CommuteMode;
  label: string;
  co2GramsPerKm: number; // Emissions per passenger-km
  microenvironmentPenetrationFactor: number; // In-transit exposure vs outdoor ambient
  averageSpeedKmh: number; // Typical Delhi NCR transit speed
  minuteVentilationLpm: number; // In-transit physical exertion ventilation rate
  description: string;
}

export interface CommuteDeltaResult {
  roundTripKm: number;
  ambientOutdoorPm25: number;
  chosenMode: CommuteModeProfile;
  baselineMode: CommuteModeProfile;
  chosen: {
    co2EmissionsGrams: number;
    inTransitPm25UgM3: number;
    transitDurationMinutes: number;
    inhaledPm25Ug: number;
  };
  baseline: {
    co2EmissionsGrams: number;
    inTransitPm25UgM3: number;
    transitDurationMinutes: number;
    inhaledPm25Ug: number;
  };
  delta: {
    co2AvoidedGrams: number;
    co2ReductionPct: number;
    pm25InhaledAvoidedUg: number;
    pm25ReductionPct: number;
  };
  summary: string;
}

/**
 * Official Commission for Air Quality Management (CAQM) Delhi-NCR GRAP Schedule.
 */
export const GRAP_STAGES: Record<GrapStageId, GrapStageDetails> = {
  stage_0: {
    stage: "stage_0",
    stageName: "Normal / Moderate Baseline",
    cpcbAqiRange: "0 – 200",
    minAqi: 0,
    maxAqi: 200,
    severityLabel: "Normal",
    colorHex: "#009E73",
    statutoryRestrictions: [
      "Standard municipal sweepings and dust control",
      "Regular periodic emission checks at PUC centers",
    ],
    citizenChecklist: [
      {
        id: "c0_1",
        category: "citizen",
        mandatory: false,
        action: "Maintain valid PUC certificate and ensure correct tire pressure",
        rationale:
          "Under-inflated tires increase fuel consumption and NOx emissions by up to 10%",
      },
    ],
    rwaChecklist: [
      {
        id: "r0_1",
        category: "rwa",
        mandatory: false,
        action: "Ensure municipal waste collection without burning leaves/waste",
        rationale:
          "Local biomass fires generate toxic dioxins and localized PM2.5 spikes",
      },
    ],
  },
  stage_1: {
    stage: "stage_1",
    stageName: "Stage I ('Poor')",
    cpcbAqiRange: "201 – 300",
    minAqi: 201,
    maxAqi: 300,
    severityLabel: "Poor",
    colorHex: "#E66101",
    statutoryRestrictions: [
      "Heavy fines on open burning of municipal solid waste and biomass",
      "Strict enforcement of dust mitigation guidelines at construction sites > 500 sq meters",
      "Mechanized sweeping and periodic water sprinkling on designated arterial roads",
      "Strict checking for visibly polluting vehicles and overloaded trucks",
    ],
    citizenChecklist: [
      {
        id: "c1_1",
        category: "citizen",
        mandatory: true,
        action: "Turn off vehicle engine at red lights and traffic stalls",
        rationale:
          "Idling burns fuel inefficiently, releasing concentrated benzene and ultrafine carbon",
      },
      {
        id: "c1_2",
        category: "citizen",
        mandatory: true,
        action: "Do not dispose of garden waste or garbage by burning",
        rationale: "Penalties up to INR 25,000 imposed by NGT/CAQM for open fires",
      },
    ],
    rwaChecklist: [
      {
        id: "r1_1",
        category: "rwa",
        mandatory: true,
        action: "Prohibit sweeping without water sprinkling inside residential societies",
        rationale:
          "Dry sweeping re-suspends fine toxic crustal dust into the breathing zone",
      },
    ],
  },
  stage_2: {
    stage: "stage_2",
    stageName: "Stage II ('Very Poor')",
    cpcbAqiRange: "301 – 400",
    minAqi: 301,
    maxAqi: 400,
    severityLabel: "Very Poor",
    colorHex: "#B2182B",
    statutoryRestrictions: [
      "Ban on diesel generator sets across all sectors (except emergency essential services)",
      "Parking fees hiked across commercial hubs to discourage private motor usage",
      "Augment Delhi Metro and DTC electric bus frequencies to maximize mass transit capacity",
      "Daily water sprinkling with dust suppressants on major transit corridors",
    ],
    citizenChecklist: [
      {
        id: "c2_1",
        category: "citizen",
        mandatory: true,
        action:
          "Switch daily commute to Delhi Metro or public bus; avoid solo car drives",
        rationale: "Public transit slashes per-capita emission footprint by over 80%",
      },
      {
        id: "c2_2",
        category: "citizen",
        mandatory: true,
        action: "Replace residential and automotive air filters (HEPA / cabin filter)",
        rationale:
          "Saturated filters increase fan motor strain and fail to capture ultrafine PM0.1",
      },
    ],
    rwaChecklist: [
      {
        id: "r2_1",
        category: "rwa",
        mandatory: true,
        action:
          "Mandate electric room heaters for security guards and staff to prevent wood/coal fires",
        rationale:
          "Night-time guard warming fires cause intense localized ground-level toxic smoke",
      },
    ],
  },
  stage_3: {
    stage: "stage_3",
    stageName: "Stage III ('Severe')",
    cpcbAqiRange: "401 – 450",
    minAqi: 401,
    maxAqi: 450,
    severityLabel: "Severe",
    colorHex: "#67001F",
    statutoryRestrictions: [
      "Complete ban on BS-III petrol and BS-IV diesel 4-wheelers in Delhi-NCR (INR 20,000 fine)",
      "Strict halt on non-essential construction and demolition activities (boring, tiling, painting)",
      "Closure of stone crushers and brick kilns not operating on clean fuels",
      "Discontinuation of physical classes for primary schools (classes up to V) in favor of hybrid/online",
    ],
    citizenChecklist: [
      {
        id: "c3_1",
        category: "citizen",
        mandatory: true,
        action:
          "Work from home (WFH) if permitted; strictly avoid outdoor physical exercise",
        rationale:
          "High breathing volume during running/cycling deposits grams of particulates in deep alveoli",
      },
      {
        id: "c3_2",
        category: "citizen",
        mandatory: true,
        action: "Equip fitted N95/FFP2 respirator masks whenever stepping outdoors",
        rationale:
          "Cloth and surgical masks filter less than 20% of sub-micron Delhi winter smog",
      },
    ],
    rwaChecklist: [
      {
        id: "r3_1",
        category: "rwa",
        mandatory: true,
        action:
          "Halt all renovation, drilling, and interior masonry inside society apartments",
        rationale:
          "CAQM mandates immediate society-level enforcement with municipal inspection rights",
      },
    ],
  },
  stage_4: {
    stage: "stage_4",
    stageName: "Stage IV ('Severe+')",
    cpcbAqiRange: "> 450",
    minAqi: 451,
    maxAqi: null,
    severityLabel: "Severe+",
    colorHex: "#7F0000",
    statutoryRestrictions: [
      "Ban on entry of non-essential trucks into Delhi (except LNG/CNG/electric and essential perishables)",
      "Ban on non-BS-VI diesel medium and heavy goods vehicles registered in Delhi",
      "Closure of all schools (up to class IX and XI); physical operations restricted",
      "Public, municipal, and private offices operate at 50% physical attendance; 50% WFH",
      "Emergency powers invoked for odd-even vehicular rationing and industrial restrictions",
    ],
    citizenChecklist: [
      {
        id: "c4_1",
        category: "citizen",
        mandatory: true,
        action:
          "Vulnerable individuals (children, elders, cardiac/pulmonary patients) remain indoors in sealed HEPA spaces",
        rationale:
          "Severe+ air triggers immediate bronchospasms, microvascular endothelial injury, and thrombosis",
      },
      {
        id: "c4_2",
        category: "citizen",
        mandatory: true,
        action: "Enforce 100% remote work wherever digitally viable",
        rationale:
          "Emergency public health measure to reduce grid congestion and road-level vehicle emissions",
      },
    ],
    rwaChecklist: [
      {
        id: "r4_1",
        category: "rwa",
        mandatory: true,
        action:
          "Activate community clean-air shelters in clubhouse/common halls equipped with high-CADR HEPA filters",
        rationale:
          "Provides emergency refuges for vulnerable residents without standalone domestic purifiers",
      },
    ],
  },
};

/**
 * Commute Mode Characteristics & Emission Factors for Delhi-NCR.
 */
export const COMMUTE_MODE_PROFILES: Record<CommuteMode, CommuteModeProfile> = {
  private_petrol_car: {
    id: "private_petrol_car",
    label: "Private Petrol Car (Single Occupant)",
    co2GramsPerKm: 160.0, // CEEW / TERI Delhi urban traffic standard
    microenvironmentPenetrationFactor: 0.35, // Cabin filtration + AC recirculation isolates 65% of PM2.5
    averageSpeedKmh: 20.0, // Delhi peak hour urban speed
    minuteVentilationLpm: 12.0, // Sedentary sitting/driving
    description:
      "High carbon footprint; moderate particulate shielding via cabin filtration.",
  },
  two_wheeler: {
    id: "two_wheeler",
    label: "Two-Wheeler (Motorcycle / Scooter)",
    co2GramsPerKm: 42.0, // 110-150cc BS-VI two-wheeler
    microenvironmentPenetrationFactor: 1.25, // Direct tailpipe wake + road dust resuspension
    averageSpeedKmh: 24.0, // Filtering urban traffic
    minuteVentilationLpm: 18.0, // Active balance and wind resistance exertion
    description:
      "Moderate CO2; EXTREMELY HIGH toxic pulmonary PM2.5 deposition directly in vehicle wake.",
  },
  metro_transit: {
    id: "metro_transit",
    label: "Delhi Metro (DMRC)",
    co2GramsPerKm: 18.0, // Electric grid factor with high passenger load factor
    microenvironmentPenetrationFactor: 0.3, // Station + carriage multi-stage HVAC filtration
    averageSpeedKmh: 32.0, // Commercial metro speed including dwell times
    minuteVentilationLpm: 15.0, // Station walking and train standing
    description: "Low carbon mass transit; controlled indoor air environment.",
  },
  work_from_home: {
    id: "work_from_home",
    label: "Work From Home (Zero Commute)",
    co2GramsPerKm: 0.0, // Zero transit emissions
    microenvironmentPenetrationFactor: 0.2, // Controlled indoor room with baseline protection
    averageSpeedKmh: 0.0, // Zero travel time
    minuteVentilationLpm: 10.0, // Resting indoor desk work
    description: "Zero commute carbon and minimal personal particulate exposure.",
  },
};

/**
 * Maps CPCB AQI value to official Delhi-NCR GRAP Stage.
 */
export function mapAqiToGrapStage(cpcbAqi: number): GrapStageDetails {
  const aqi = Number.isFinite(cpcbAqi) ? Math.max(0, cpcbAqi) : 0;
  if (aqi <= 200) {
    return GRAP_STAGES.stage_0;
  }
  if (aqi <= 300) {
    return GRAP_STAGES.stage_1;
  }
  if (aqi <= 400) {
    return GRAP_STAGES.stage_2;
  }
  if (aqi <= 450) {
    return GRAP_STAGES.stage_3;
  }
  return GRAP_STAGES.stage_4;
}

/**
 * Computes Commute Carbon Emissions and Personal Inhaled PM2.5 Dose Deltas.
 *
 * Formulas:
 * Transit Duration (min) = (Distance Km / Speed Kmh) * 60
 * In-Transit PM2.5 (µg/m³) = Ambient PM2.5 * Penetration Factor
 * Inhaled PM2.5 (µg) = In-Transit PM2.5 * (Minute Ventilation L/min * 10^-3) * Transit Duration (min)
 * CO2 Emissions (g) = Distance Km * Mode CO2 g/km
 */
export function calculateCommuteDeltas(
  roundTripKm: number,
  ambientOutdoorPm25: number,
  chosenMode: CommuteMode,
  baselineMode: CommuteMode = "private_petrol_car",
): CommuteDeltaResult {
  const km = Number.isFinite(roundTripKm) ? Math.max(0, roundTripKm) : 0;
  const ambient = Number.isFinite(ambientOutdoorPm25)
    ? Math.max(0, ambientOutdoorPm25)
    : 0;

  const chosenProfile = COMMUTE_MODE_PROFILES[chosenMode];
  const baselineProfile = COMMUTE_MODE_PROFILES[baselineMode];

  const calculateMetrics = (profile: CommuteModeProfile) => {
    const co2Grams = Number((km * profile.co2GramsPerKm).toFixed(1));
    const inTransitPm25 = Number(
      (ambient * profile.microenvironmentPenetrationFactor).toFixed(2),
    );

    let durationMinutes = 0;
    if (profile.averageSpeedKmh > 0 && km > 0) {
      durationMinutes = Number(((km / profile.averageSpeedKmh) * 60).toFixed(1));
    }

    // Inhaled Dose (µg) = PM2.5 (µg/m³) * Air Volume (m³)
    // Air Volume (m³) = V_E (L/min) * Duration (min) / 1000
    const airVolumeM3 = (profile.minuteVentilationLpm * durationMinutes) / 1000;
    const inhaledPm25Ug = Number((inTransitPm25 * airVolumeM3).toFixed(2));

    return {
      co2EmissionsGrams: co2Grams,
      inTransitPm25UgM3: inTransitPm25,
      transitDurationMinutes: durationMinutes,
      inhaledPm25Ug,
    };
  };

  const chosenMetrics = calculateMetrics(chosenProfile);
  const baselineMetrics = calculateMetrics(baselineProfile);

  const co2AvoidedGrams = Number(
    (baselineMetrics.co2EmissionsGrams - chosenMetrics.co2EmissionsGrams).toFixed(1),
  );
  const co2ReductionPct =
    baselineMetrics.co2EmissionsGrams > 0
      ? Number(((co2AvoidedGrams / baselineMetrics.co2EmissionsGrams) * 100).toFixed(1))
      : 0;

  const pm25InhaledAvoidedUg = Number(
    (baselineMetrics.inhaledPm25Ug - chosenMetrics.inhaledPm25Ug).toFixed(2),
  );
  const pm25ReductionPct =
    baselineMetrics.inhaledPm25Ug > 0
      ? Number(((pm25InhaledAvoidedUg / baselineMetrics.inhaledPm25Ug) * 100).toFixed(1))
      : 0;

  const summary =
    `Switching from ${baselineProfile.label} to ${chosenProfile.label} for a ${km} km round-trip: ` +
    `saves ${co2AvoidedGrams} g of CO2 (${co2ReductionPct}% reduction) and avoids inhaling ` +
    `${pm25InhaledAvoidedUg} µg of pulmonary PM2.5 (${pm25ReductionPct}% exposure reduction).`;

  return {
    roundTripKm: km,
    ambientOutdoorPm25: ambient,
    chosenMode: chosenProfile,
    baselineMode: baselineProfile,
    chosen: chosenMetrics,
    baseline: baselineMetrics,
    delta: {
      co2AvoidedGrams,
      co2ReductionPct,
      pm25InhaledAvoidedUg,
      pm25ReductionPct,
    },
    summary,
  };
}
