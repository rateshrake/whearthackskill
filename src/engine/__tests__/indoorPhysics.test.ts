import { describe, it, expect } from "vitest";
import {
  calculateRoomVolume,
  modelSteadyStateIndoorPm25,
  calculateRequiredCadr,
  estimateCombustionSpike,
  COMBUSTION_EVENT_PROFILES,
  MASS_BALANCE_PHYSICS,
  type RoomDimensions,
} from "../indoorPhysics";

describe("Module 3: indoorPhysics", () => {
  const standardBedroom: RoomDimensions = {
    lengthMeters: 5.0,
    widthMeters: 4.0,
    heightMeters: 2.8,
  };
  const volume56 = 5.0 * 4.0 * 2.8; // 56.0 m³

  describe("Room Volume & Validation", () => {
    it("should calculate correct room volume in cubic meters", () => {
      expect(calculateRoomVolume(standardBedroom)).toBe(56.0);
    });

    it("should throw error on non-positive room dimensions", () => {
      expect(() =>
        calculateRoomVolume({ lengthMeters: 0, widthMeters: 4, heightMeters: 3 }),
      ).toThrow("Room dimensions must be positive non-zero numbers.");

      expect(() =>
        calculateRoomVolume({ lengthMeters: 5, widthMeters: -2, heightMeters: 3 }),
      ).toThrow();

      expect(() =>
        calculateRoomVolume({
          lengthMeters: Number.NaN,
          widthMeters: 4,
          heightMeters: 3,
        }),
      ).toThrow("Room dimensions must be positive non-zero numbers.");

      expect(() =>
        estimateCombustionSpike(
          "incense_stick",
          standardBedroom,
          25,
          Number.POSITIVE_INFINITY,
        ),
      ).toThrow(RangeError);
    });
  });

  describe("Steady-State Single-Zone Mass Balance Modeling", () => {
    it("should model Open Windows baseline with ~92% infiltration", () => {
      // Open windows physics:
      // P = 0.95, lambda_v = 3.0 h^-1, k_dep = 0.10 h^-1
      // Infiltration ratio = (0.95 * 3.0) / (3.0 + 0.10) = 2.85 / 3.10 = 0.91935... (~91.94%)
      const result = modelSteadyStateIndoorPm25(100.0, standardBedroom, "open_windows");

      expect(result.infiltrationRatio).toBeCloseTo(0.9194, 3);
      expect(result.indoorPm25).toBeCloseTo(91.94, 1);
      expect(result.cadrM3h).toBe(0);
      expect(result.airChangesPerHourTotal).toBe(3.1);
    });

    it("should model Closed Windows without filtration with ~81% infiltration", () => {
      // Closed windows without filter:
      // P = 0.90, lambda_v = 0.65 h^-1, k_dep = 0.07 h^-1
      // Infiltration ratio = (0.90 * 0.65) / (0.65 + 0.07) = 0.585 / 0.72 = 0.8125 (81.25%)
      const result = modelSteadyStateIndoorPm25(
        100.0,
        standardBedroom,
        "closed_windows_no_filter",
      );

      expect(result.infiltrationRatio).toBe(0.8125);
      expect(result.indoorPm25).toBe(81.25);
      expect(result.cadrM3h).toBe(0);
      expect(result.airChangesPerHourTotal).toBe(0.72);
    });

    it("should model Closed Windows + HEPA purifier reducing PM2.5 sharply", () => {
      // Purifier with CADR = 250 m³/h in 56 m³ room:
      // ACH_hepa = 250 / 56 = 4.464 h^-1
      // Total loss = 0.72 + 4.464 = 5.184 h^-1
      // Infiltration ratio = 0.585 / 5.184 = 0.1128 (~11.28%)
      const result = modelSteadyStateIndoorPm25(
        100.0,
        standardBedroom,
        "closed_windows_hepa",
        250.0,
      );

      expect(result.cadrM3h).toBe(250.0);
      expect(result.cadrCfm).toBeCloseTo(147.1, 1);
      expect(result.airChangesPerHourHepa).toBeCloseTo(4.46, 1);
      expect(result.infiltrationRatio).toBeLessThan(0.15);
      expect(result.indoorPm25).toBeLessThan(15.0);
    });
  });

  describe("Target CADR Sizing Calculations", () => {
    it("should match hand-worked reference calculation for target 21% infiltration", () => {
      // Room: 5.0 * 4.0 * 2.8 = 56 m³
      // Target infiltration ratio = 0.21
      // Required total loss = 0.585 / 0.21 = 2.78571 h^-1
      // Baseline loss = 0.72 h^-1
      // Required HEPA ACH = 2.78571 - 0.72 = 2.06571 h^-1
      // Required CADR = 56 * 2.06571 = 115.68 m³/h (~115.7 m³/h)
      // Required CFM = 115.68 * 0.588578 = 68.08 CFM (~68.1 CFM)
      const cadrResult = calculateRequiredCadr(150.0, standardBedroom, {
        targetInfiltrationRatio: MASS_BALANCE_PHYSICS.TARGET_HEPA_INFILTRATION_RATIO,
      });

      expect(cadrResult.roomVolumeM3).toBe(volume56);
      expect(cadrResult.requiredCadrM3h).toBe(115.7);
      expect(cadrResult.requiredCadrCfm).toBe(68.1);
      expect(cadrResult.requiredAchHepa).toBe(2.07);
      expect(cadrResult.isAchievableWithoutFilter).toBe(false);
      expect(cadrResult.recommendation).toContain("115.7 m³/h (68.1 CFM)");
    });

    it("should calculate target CADR for WHO Interim Target 1 (35 µg/m³) at severe outdoor levels", () => {
      // Outdoor PM2.5 = 200 µg/m³, Target indoor PM2.5 = 35 µg/m³
      // Target ratio = 35 / 200 = 0.175
      // Required total loss = 0.585 / 0.175 = 3.34286 h^-1
      // Required HEPA ACH = 3.34286 - 0.72 = 2.62286 h^-1
      // Required CADR = 56 * 2.62286 = 146.88 m³/h (~146.9 m³/h)
      const whoResult = calculateRequiredCadr(200.0, standardBedroom, {
        targetIndoorPm25: 35.0,
      });

      expect(whoResult.targetPm25).toBe(35.0);
      expect(whoResult.targetInfiltrationRatio).toBe(0.175);
      expect(whoResult.requiredCadrM3h).toBe(146.9);
      expect(whoResult.requiredCadrCfm).toBeCloseTo(86.5, 1);
    });

    it("should handle outdoorPm25 = 0 edge case with targetIndoorPm25", () => {
      const zeroOutdoor = calculateRequiredCadr(0, standardBedroom, {
        targetIndoorPm25: 15.0,
      });
      expect(zeroOutdoor.outdoorPm25).toBe(0);
      expect(zeroOutdoor.isAchievableWithoutFilter).toBe(true);
      expect(zeroOutdoor.requiredCadrM3h).toBe(0);

      const zeroOutdoorNoTarget = calculateRequiredCadr(0, standardBedroom);
      expect(zeroOutdoorNoTarget.isAchievableWithoutFilter).toBe(true);
      expect(zeroOutdoorNoTarget.requiredCadrM3h).toBe(0);
    });

    it("should recognize when target is already achievable without filtration", () => {
      // Natural infiltration is 81.25%. If target ratio requested is 85%:
      const easyTarget = calculateRequiredCadr(50.0, standardBedroom, {
        targetInfiltrationRatio: 0.85,
      });
      expect(easyTarget.isAchievableWithoutFilter).toBe(true);
      expect(easyTarget.requiredCadrM3h).toBe(0);
      expect(easyTarget.recommendation).toContain(
        "already satisfies the requested target",
      );
    });
  });

  describe("Indoor Combustion Spike & Ventilation Recovery Estimator", () => {
    it("should have literature-grounded citations for all combustion profiles", () => {
      expect(COMBUSTION_EVENT_PROFILES.mosquito_coil.literatureCitation).toContain(
        "Liu, W., Zhang, J.",
      );
      expect(COMBUSTION_EVENT_PROFILES.mosquito_coil.scientificDisclaimer).toContain(
        "equivalent to smoking 75 to 100 non-filtered cigarettes",
      );

      expect(COMBUSTION_EVENT_PROFILES.unvented_frying.literatureCitation).toContain(
        "See, S.W. & Balasubramanian, R.",
      );
      expect(COMBUSTION_EVENT_PROFILES.incense_stick.chemicalHazards).toContain(
        "Benzene",
      );
    });

    it("should estimate exponential decay recovery times for unvented_frying", () => {
      // Room 56 m³, baseline indoor = 20 µg/m³, HEPA CADR = 250 m³/h
      // k_closed = 0.72 h^-1 -> t_closed = ln(10)/0.72 * 60 = 2.3026 / 0.72 * 60 = 192 min
      // k_flush = 3.10 h^-1 -> t_flush = 2.3026 / 3.10 * 60 = 45 min
      // k_hepa = 0.72 + (250 / 56) = 0.72 + 4.464 = 5.184 -> t_hepa = 2.3026 / 5.184 * 60 = 27 min
      const spike = estimateCombustionSpike(
        "unvented_frying",
        standardBedroom,
        20.0,
        250.0,
      );

      expect(spike.event.id).toBe("unvented_frying");
      expect(spike.roomVolumeM3).toBe(56.0);
      expect(spike.peakTotalIndoorPm25).toBeGreaterThan(100.0);
      expect(spike.recoveryTimesMinutes.closedWindowsNoFilter).toBe(192);
      expect(spike.recoveryTimesMinutes.openWindowsRapidFlush).toBe(45);
      expect(spike.recoveryTimesMinutes.closedWindowsWithHepa).toBe(27);
      expect(spike.protectiveAdvice).toContain("range exhaust hood");
    });

    it("should provide extreme safety warning for mosquito_coil", () => {
      const coil = estimateCombustionSpike("mosquito_coil", standardBedroom);
      expect(coil.protectiveAdvice).toContain(
        "DANGER: Never burn mosquito coils indoors",
      );
      expect(coil.peakTotalIndoorPm25).toBeGreaterThan(300.0);
    });

    it("should provide recovery advice for incense_stick", () => {
      const incense = estimateCombustionSpike("incense_stick", standardBedroom);
      expect(incense.protectiveAdvice).toContain("Extinguish incense immediately");
    });
  });
});
