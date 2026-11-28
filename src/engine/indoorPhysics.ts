/**
 * VayuShield Deterministic Physics & Index Kernel
 * Module: indoorPhysics.ts
 *
 * Implements:
 * 1. Steady-state single-zone mass balance indoor PM2.5 modeling:
 *    - Open windows baseline (~92% infiltration)
 *    - Closed windows without filtration (~81% infiltration)
 *    - Closed windows + HEPA filtration (CADR sizing for <= 21% infiltration or WHO interim targets)
 * 2. Indoor combustion spike estimator:
 *    - unvented_frying, mosquito_coil, incense_stick
 *    - Literature-grounded citations and toxicological disclaimers
 *    - Exponential decay and ventilation recovery time calculations
 *
 * 100% pure isomorphic TypeScript with zero dependencies.
 */

export interface RoomDimensions {
  lengthMeters: number;
  widthMeters: number;
  heightMeters: number;
}

export type IndoorVentilationMode =
  "open_windows" | "closed_windows_no_filter" | "closed_windows_hepa";

export interface MassBalanceParameters {
  penetrationCoefficient: number; // P (dimensionless, 0-1)
  airExchangeRateAch: number; // lambda_v (h^-1)
  depositionRatePerHr: number; // k_dep (h^-1)
}

export interface SteadyStateIndoorResult {
  roomDimensions: RoomDimensions;
  roomVolumeM3: number;
  outdoorPm25: number;
  mode: IndoorVentilationMode;
  infiltrationRatio: number; // C_in / C_out
  indoorPm25: number;
  cadrM3h: number;
  cadrCfm: number;
  airChangesPerHourTotal: number;
  airChangesPerHourHepa: number;
}

export interface TargetCadrResult {
  roomVolumeM3: number;
  outdoorPm25: number;
  targetPm25: number;
  targetInfiltrationRatio: number;
  requiredCadrM3h: number;
  requiredCadrCfm: number;
  requiredAchHepa: number;
  isAchievableWithoutFilter: boolean;
  recommendation: string;
}

export type CombustionEventType = "unvented_frying" | "mosquito_coil" | "incense_stick";

export interface CombustionEventProfile {
  id: CombustionEventType;
  label: string;
  emissionRateUgPerMin: number;
  typicalDurationMinutes: number;
  totalMassEmittedUg: number;
  peakSpikeAddedUgM3: number; // In reference 35 m³ closed room
  literatureCitation: string;
  scientificDisclaimer: string;
  chemicalHazards: string[];
}

export interface CombustionSpikeEstimate {
  event: CombustionEventProfile;
  roomVolumeM3: number;
  baselineIndoorPm25: number;
  peakSpikeConcentrationUgM3: number;
  peakTotalIndoorPm25: number;
  recoveryTimesMinutes: {
    closedWindowsNoFilter: number;
    closedWindowsWithHepa: number;
    openWindowsRapidFlush: number;
  };
  recoveryTargetPm25: number;
  protectiveAdvice: string;
}

/**
 * Standard Physical Constants for Delhi-NCR and Urban Housing Typology.
 */
export const MASS_BALANCE_PHYSICS = {
  // Open windows: high air exchange (3.0 ACH), high penetration P=0.95, k_dep=0.10
  // Ratio = (0.95 * 3.0) / (3.0 + 0.10) = 2.85 / 3.10 = ~0.919 (92%)
  OPEN_WINDOWS: {
    penetrationCoefficient: 0.95,
    airExchangeRateAch: 3.0,
    depositionRatePerHr: 0.1,
  } as const satisfies MassBalanceParameters,

  // Closed windows no filter: envelope infiltration P=0.90, lambda_v=0.65 ACH, k_dep=0.07
  // Ratio = (0.90 * 0.65) / (0.65 + 0.07) = 0.585 / 0.72 = ~0.8125 (81%)
  CLOSED_NO_FILTER: {
    penetrationCoefficient: 0.9,
    airExchangeRateAch: 0.65,
    depositionRatePerHr: 0.07,
  } as const satisfies MassBalanceParameters,

  // Target infiltration ratio threshold for high-performance protection
  TARGET_HEPA_INFILTRATION_RATIO: 0.21, // <= 21% infiltration
  CFM_PER_M3H: 0.588578, // 1 m³/h = ~0.5886 CFM
};

/**
 * Peer-reviewed combustion profiles for discrete residential emission spikes.
 */
export const COMBUSTION_EVENT_PROFILES: Record<
  CombustionEventType,
  CombustionEventProfile
> = {
  unvented_frying: {
    id: "unvented_frying",
    label: "Unvented High-Heat Frying / Tadka",
    emissionRateUgPerMin: 1800.0,
    typicalDurationMinutes: 15,
    totalMassEmittedUg: 27000.0,
    peakSpikeAddedUgM3: 210.0,
    literatureCitation:
      "See, S.W. & Balasubramanian, R. (2011). Chemical characteristics of fine particles emitted from cooking activities. Atmospheric Environment, 42(39), 8852-8862.",
    scientificDisclaimer:
      "High thermal breakdown of cooking oils releases fine and ultrafine droplets, acrolein, and polycyclic aromatic hydrocarbons (PAHs). Concentrations vary widely based on oil smoke point, cookware temperature, and kitchen volume.",
    chemicalHazards: ["Acrolein", "PAHs", "Ultrafine lipid aerosols", "Aldehydes"],
  },
  mosquito_coil: {
    id: "mosquito_coil",
    label: "Mosquito Repellent Coil (Smoldering)",
    emissionRateUgPerMin: 230.0,
    typicalDurationMinutes: 360, // 6 hours smoldering burn
    totalMassEmittedUg: 82800.0,
    peakSpikeAddedUgM3: 550.0,
    literatureCitation:
      "Liu, W., Zhang, J., et al. (2003). Mosquito coil emissions and health implications. Environmental Health Perspectives, 111(12), 1454-1460.",
    scientificDisclaimer:
      "Burning a single pyrethroid mosquito coil in an enclosed room generates submicron particulate matter (PM2.5) mass equivalent to smoking 75 to 100 non-filtered cigarettes. Emits significant bis(chloromethyl)ether, formaldehyde, and heavy metals.",
    chemicalHazards: [
      "Pyrethroid transfluthrin/d-allethrin",
      "Formaldehyde",
      "Benzene",
      "Bis(chloromethyl)ether",
    ],
  },
  incense_stick: {
    id: "incense_stick",
    label: "Incense Stick / Agarbatti Burning",
    emissionRateUgPerMin: 110.0,
    typicalDurationMinutes: 40,
    totalMassEmittedUg: 4400.0,
    peakSpikeAddedUgM3: 240.0,
    literatureCitation:
      "Lin, T.C., et al. (2008). Characteristics of polycyclic aromatic hydrocarbons and total suspended particulates in indoor air of temples. Bull. Environ. Contam. Toxicol., 81(4), 374-378.",
    scientificDisclaimer:
      "Aromatic wood powder, resins, and synthetic fragrance release condensed aromatic carbon cores with mutagenic PAH coatings. Generates persistent ultrafine particles with long alveolar clearance half-lives.",
    chemicalHazards: ["Benzene", "Toluene", "Phenanthrene", "Carbon monoxide"],
  },
};

/**
 * Calculates Room Volume in cubic meters (V = L * W * H).
 */
export function calculateRoomVolume(dims: RoomDimensions): number {
  if (
    !Number.isFinite(dims.lengthMeters) ||
    !Number.isFinite(dims.widthMeters) ||
    !Number.isFinite(dims.heightMeters) ||
    dims.lengthMeters <= 0 ||
    dims.widthMeters <= 0 ||
    dims.heightMeters <= 0
  ) {
    throw new RangeError("Room dimensions must be positive non-zero numbers.");
  }
  return Number((dims.lengthMeters * dims.widthMeters * dims.heightMeters).toFixed(2));
}

const VENTILATION_MODE_PARAMS: Record<IndoorVentilationMode, MassBalanceParameters> = {
  open_windows: MASS_BALANCE_PHYSICS.OPEN_WINDOWS,
  closed_windows_no_filter: MASS_BALANCE_PHYSICS.CLOSED_NO_FILTER,
  closed_windows_hepa: MASS_BALANCE_PHYSICS.CLOSED_NO_FILTER,
};

/**
 * Models steady-state indoor PM2.5 concentration using single-zone mass balance:
 *
 * Infiltration Factor F_inf = (P * lambda_v) / (lambda_v + k_dep + CADR / V)
 * C_in = C_out * F_inf
 */
export function modelSteadyStateIndoorPm25(
  outdoorPm25: number,
  roomDims: RoomDimensions,
  mode: IndoorVentilationMode,
  customCadrM3h = 0,
): SteadyStateIndoorResult {
  if (!Number.isFinite(outdoorPm25)) {
    throw new RangeError("outdoorPm25 must be a finite number.");
  }
  if (!Number.isFinite(customCadrM3h)) {
    throw new RangeError("customCadrM3h must be a finite number.");
  }

  const volume = calculateRoomVolume(roomDims);
  const cOut = Math.max(0, outdoorPm25);
  const params = VENTILATION_MODE_PARAMS[mode];
  const cadr = mode === "closed_windows_hepa" ? Math.max(0, customCadrM3h) : 0;

  const cadrAch = cadr / volume;
  const totalLoss = params.airExchangeRateAch + params.depositionRatePerHr + cadrAch;
  const infiltrationRatio =
    (params.penetrationCoefficient * params.airExchangeRateAch) / totalLoss;
  const indoorPm25 = Number((cOut * infiltrationRatio).toFixed(2));

  return {
    roomDimensions: roomDims,
    roomVolumeM3: volume,
    outdoorPm25: cOut,
    mode,
    infiltrationRatio: Number(infiltrationRatio.toFixed(4)),
    indoorPm25,
    cadrM3h: cadr,
    cadrCfm: Number((cadr * MASS_BALANCE_PHYSICS.CFM_PER_M3H).toFixed(1)),
    airChangesPerHourTotal: Number(totalLoss.toFixed(2)),
    airChangesPerHourHepa: Number(cadrAch.toFixed(2)),
  };
}

/**
 * Calculates Required HEPA CADR to achieve a target indoor PM2.5 or infiltration ratio (e.g. <= 21%).
 *
 * Derivation:
 * Target F_inf >= (P * lambda_v) / (lambda_v + k_dep + CADR / V)
 * CADR / V >= (P * lambda_v / F_inf) - (lambda_v + k_dep)
 * Required CADR = V * [ (P * lambda_v / F_inf) - (lambda_v + k_dep) ]
 */
export function calculateRequiredCadr(
  outdoorPm25: number,
  roomDims: RoomDimensions,
  targetOptions: {
    targetInfiltrationRatio?: number | undefined;
    targetIndoorPm25?: number | undefined;
  } = {},
): TargetCadrResult {
  if (!Number.isFinite(outdoorPm25)) {
    throw new RangeError("outdoorPm25 must be a finite number.");
  }
  if (
    targetOptions.targetInfiltrationRatio !== undefined &&
    !Number.isFinite(targetOptions.targetInfiltrationRatio)
  ) {
    throw new RangeError("targetInfiltrationRatio must be a finite number.");
  }
  if (
    targetOptions.targetIndoorPm25 !== undefined &&
    !Number.isFinite(targetOptions.targetIndoorPm25)
  ) {
    throw new RangeError("targetIndoorPm25 must be a finite number.");
  }

  const volume = calculateRoomVolume(roomDims);
  const cOut = Math.max(0, outdoorPm25);

  const p = MASS_BALANCE_PHYSICS.CLOSED_NO_FILTER.penetrationCoefficient;
  const lambdaV = MASS_BALANCE_PHYSICS.CLOSED_NO_FILTER.airExchangeRateAch;
  const kDep = MASS_BALANCE_PHYSICS.CLOSED_NO_FILTER.depositionRatePerHr;
  const baselineLoss = lambdaV + kDep; // 0.72 h^-1
  const naturalInfiltrationRatio = (p * lambdaV) / baselineLoss; // ~0.8125

  let targetRatio =
    targetOptions.targetInfiltrationRatio ??
    MASS_BALANCE_PHYSICS.TARGET_HEPA_INFILTRATION_RATIO;

  let targetPm25 = targetOptions.targetIndoorPm25;

  if (cOut <= 0 || (targetPm25 !== undefined && cOut <= targetPm25)) {
    return {
      roomVolumeM3: volume,
      outdoorPm25: cOut,
      targetPm25: Number(Math.max(0, targetPm25 ?? 0).toFixed(1)),
      targetInfiltrationRatio: Number(naturalInfiltrationRatio.toFixed(4)),
      requiredCadrM3h: 0,
      requiredCadrCfm: 0,
      requiredAchHepa: 0,
      isAchievableWithoutFilter: true,
      recommendation: `Outdoor air concentration (${cOut} µg/m³) is already at or below target; no active filtration required.`,
    };
  }

  if (targetPm25 !== undefined) {
    targetPm25 = Math.max(0, targetPm25);
    targetRatio = Math.min(targetRatio, targetPm25 / cOut);
  } else {
    targetPm25 = Number((cOut * targetRatio).toFixed(2));
  }

  // Prevent impossible or negative target ratios
  targetRatio = Math.max(0.01, Math.min(1.0, targetRatio));

  let requiredCadrM3h = 0;
  let isAchievableWithoutFilter = false;

  if (targetRatio >= naturalInfiltrationRatio) {
    requiredCadrM3h = 0;
    isAchievableWithoutFilter = true;
  } else {
    const requiredHepaAch = (p * lambdaV) / targetRatio - baselineLoss;
    requiredCadrM3h = Math.max(0, volume * requiredHepaAch);
  }

  const roundedCadrM3h = Number(requiredCadrM3h.toFixed(1));
  const roundedCadrCfm = Number(
    (roundedCadrM3h * MASS_BALANCE_PHYSICS.CFM_PER_M3H).toFixed(1),
  );
  const requiredAchHepa = Number((roundedCadrM3h / volume).toFixed(2));

  let recommendation: string;
  if (isAchievableWithoutFilter) {
    recommendation = `Natural closed windows infiltration (${(naturalInfiltrationRatio * 100).toFixed(1)}%) already satisfies the requested target.`;
  } else {
    recommendation =
      `To achieve <= ${(targetRatio * 100).toFixed(1)}% infiltration (${targetPm25} µg/m³ indoor at ${cOut} µg/m³ outdoor), ` +
      `install a HEPA purifier delivering at least ${roundedCadrM3h} m³/h (${roundedCadrCfm} CFM), providing ${requiredAchHepa} air changes per hour.`;
  }

  return {
    roomVolumeM3: volume,
    outdoorPm25: cOut,
    targetPm25: Number(targetPm25.toFixed(1)),
    targetInfiltrationRatio: Number(targetRatio.toFixed(4)),
    requiredCadrM3h: roundedCadrM3h,
    requiredCadrCfm: roundedCadrCfm,
    requiredAchHepa,
    isAchievableWithoutFilter,
    recommendation,
  };
}

/**
 * Estimates Indoor Combustion Spikes and Ventilation Recovery Time.
 *
 * Decay Equation:
 * C(t) = C_baseline + DeltaC_spike * exp(-k_total * t)
 *
 * Recovery time to reach target C_target:
 * t_rec = (1 / k_total) * ln( DeltaC_spike / (C_target - C_baseline) )
 */
export function estimateCombustionSpike(
  eventType: CombustionEventType,
  roomDims: RoomDimensions,
  baselineIndoorPm25 = 25.0,
  hepaCadrM3h = 250.0,
): CombustionSpikeEstimate {
  if (!Number.isFinite(baselineIndoorPm25) || !Number.isFinite(hepaCadrM3h)) {
    throw new RangeError("baselineIndoorPm25 and hepaCadrM3h must be finite numbers.");
  }

  const volume = calculateRoomVolume(roomDims);
  const profile = COMBUSTION_EVENT_PROFILES[eventType];
  const safeBaseline = Math.max(0, baselineIndoorPm25);
  const safeHepaCadr = Math.max(0, hepaCadrM3h);

  // Scale spike concentration inversely with room volume (reference 35 m³)
  const referenceVolume = 35.0;
  const scaledSpikeUgM3 = Number(
    (profile.peakSpikeAddedUgM3 * (referenceVolume / volume)).toFixed(2),
  );
  const peakTotalIndoorPm25 = Number((safeBaseline + scaledSpikeUgM3).toFixed(2));

  // Recovery target: baseline + 10% of spike (i.e. 90% cleared)
  const recoveryTargetPm25 = Number((safeBaseline + 0.1 * scaledSpikeUgM3).toFixed(2));

  // Loss constants k_total (h^-1)
  const kClosedNoFilter =
    MASS_BALANCE_PHYSICS.CLOSED_NO_FILTER.airExchangeRateAch +
    MASS_BALANCE_PHYSICS.CLOSED_NO_FILTER.depositionRatePerHr; // 0.72 h^-1

  const hepaAch = safeHepaCadr / volume;
  const kClosedHepa = kClosedNoFilter + hepaAch;

  const kRapidFlush =
    MASS_BALANCE_PHYSICS.OPEN_WINDOWS.airExchangeRateAch +
    MASS_BALANCE_PHYSICS.OPEN_WINDOWS.depositionRatePerHr; // 3.10 h^-1

  // Time in hours to clear 90% of spike: t = ln(10) / k_total = 2.3026 / k_total
  const lnRatio = Math.log(10);
  const tClosedNoFilterMin = Math.round((lnRatio / kClosedNoFilter) * 60);
  const tClosedHepaMin = Math.round((lnRatio / kClosedHepa) * 60);
  const tRapidFlushMin = Math.round((lnRatio / kRapidFlush) * 60);

  let protectiveAdvice = "";
  if (eventType === "mosquito_coil") {
    protectiveAdvice =
      "DANGER: Never burn mosquito coils indoors in an unventilated space. Switch immediately to electric vaporizers, physical bed nets, or UL-certified HEPA purifiers with active carbon.";
  } else if (eventType === "unvented_frying") {
    protectiveAdvice =
      "Turn on range exhaust hood (150-300 CFM) 2 minutes BEFORE frying and run for 15 minutes post-cooking. Close bedroom doors to contain volatile lipid migration.";
  } else {
    protectiveAdvice =
      "Extinguish incense immediately. Open windows for 15 minutes rapid flush or run HEPA purifier at maximum fan speed.";
  }

  return {
    event: profile,
    roomVolumeM3: volume,
    baselineIndoorPm25: safeBaseline,
    peakSpikeConcentrationUgM3: scaledSpikeUgM3,
    peakTotalIndoorPm25,
    recoveryTimesMinutes: {
      closedWindowsNoFilter: tClosedNoFilterMin,
      closedWindowsWithHepa: tClosedHepaMin,
      openWindowsRapidFlush: tRapidFlushMin,
    },
    recoveryTargetPm25,
    protectiveAdvice,
  };
}
