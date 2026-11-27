import { describe, it, expect } from "vitest";
import {
  correctOpticalHygroscopicGrowth,
  processDiurnalObservations,
  computeRollingDiurnalWindows,
  calculateRespiratoryDose,
  HOUSEHOLD_ARCHETYPES,
  type DiurnalObservation,
  type ExposureWindow,
} from "../diurnalOptimizer";

describe("Module 2: diurnalOptimizer", () => {
  describe("Optical Sensor Hygroscopic Growth Correction", () => {
    it("should NOT apply correction when humidity is <= 75%", () => {
      const at50 = correctOpticalHygroscopicGrowth(100, 50);
      expect(at50.wasAdjusted).toBe(false);
      expect(at50.adjustedPm25).toBe(100);
      expect(at50.hygroscopicFactor).toBe(1.0);

      const at75 = correctOpticalHygroscopicGrowth(80, 75);
      expect(at75.wasAdjusted).toBe(false);
      expect(at75.adjustedPm25).toBe(80);
      expect(at75.hygroscopicFactor).toBe(1.0);
    });

    it("should NOT apply correction when humidity is undefined or >= 100%", () => {
      const noRh = correctOpticalHygroscopicGrowth(120, undefined);
      expect(noRh.wasAdjusted).toBe(false);
      expect(noRh.adjustedPm25).toBe(120);

      const invalidRh = correctOpticalHygroscopicGrowth(120, 105);
      expect(invalidRh.wasAdjusted).toBe(false);
      expect(invalidRh.adjustedPm25).toBe(120);
    });

    it("should calculate exact hand-worked hygroscopic correction for RH = 80%", () => {
      // RH = 80% (0.80)
      // kappa = 0.25
      // (0.8^2) / (1 - 0.8) = 0.64 / 0.2 = 3.2
      // CF = 1 + 0.25 * 3.2 = 1 + 0.8 = 1.80
      // For PM2.5 = 90 µg/m³:
      // adjusted = 90 / 1.80 = 50.0 µg/m³
      const result = correctOpticalHygroscopicGrowth(90, 80);
      expect(result.wasAdjusted).toBe(true);
      expect(result.hygroscopicFactor).toBe(1.8);
      expect(result.adjustedPm25).toBe(50.0);
    });

    it("should calculate exact hand-worked hygroscopic correction for RH = 85%", () => {
      // RH = 85% (0.85)
      // (0.85^2) / (1 - 0.85) = 0.7225 / 0.15 = 4.81667
      // CF = 1 + 0.25 * 4.81667 = 2.20417 -> ~2.204
      // For raw PM2.5 = 110.2: 110.2 / 2.20417 = 50.0
      const result = correctOpticalHygroscopicGrowth(110.2, 85);
      expect(result.wasAdjusted).toBe(true);
      expect(result.hygroscopicFactor).toBe(2.204);
      expect(result.adjustedPm25).toBeCloseTo(50.0, 1);
    });
  });

  describe("Diurnal Processing & Rolling 2-Hour Windows", () => {
    // Generate a 48-hour synthetic diurnal dataset representing typical Delhi winter:
    // Nocturnal peak (midnight to 8am): high PM2.5 (180 - 240 µg/m³) due to boundary layer inversion
    // Afternoon trough (1pm to 4pm): lowest PM2.5 (50 - 70 µg/m³) due to solar thermal mixing
    const generate48hData = (): DiurnalObservation[] => {
      const data: DiurnalObservation[] = [];
      const baseDate = new Date("2026-11-20T00:00:00Z");

      for (let hour = 0; hour < 48; hour++) {
        const time = new Date(baseDate.getTime() + hour * 3600 * 1000);
        const hourOfDay = hour % 24;

        let pm25 = 120;
        let humidity = 65;

        // Morning/nocturnal inversion peak (hours 4-7)
        if (hourOfDay >= 4 && hourOfDay <= 7) {
          pm25 = 220;
          humidity = 82; // High humidity fog/smog
        } else if (hourOfDay >= 13 && hourOfDay <= 16) {
          // Afternoon solar ventilation trough
          pm25 = 55;
          humidity = 45;
        }

        data.push({
          timestampIso: time.toISOString(),
          pm25,
          pm10: pm25 * 1.8,
          humidityPct: humidity,
        });
      }
      return data;
    };

    it("should handle empty observations safely", () => {
      const emptyResult = computeRollingDiurnalWindows([]);
      expect(emptyResult.windows).toHaveLength(0);
      expect(emptyResult.cleanestToday).toBeNull();
      expect(emptyResult.worstToday).toBeNull();
      expect(emptyResult.cleanestTomorrow).toBeNull();
      expect(emptyResult.worstTomorrow).toBeNull();
      expect(emptyResult.humidityAdjustmentCount).toBe(0);
    });

    it("should process observations without humidity correction or missing humidity", () => {
      const data: DiurnalObservation[] = [
        {
          timestampIso: "2026-11-20T00:00:00Z",
          pm25: 100,
          pm10: 180,
        },
        {
          timestampIso: "2026-11-20T01:00:00Z",
          pm25: 110,
          pm10: 200,
          humidityPct: 85,
        },
      ];
      // Test when correction is disabled
      const uncorrected = processDiurnalObservations(data, false);
      expect(uncorrected[1]?.wasHumidityAdjusted).toBe(false);
      expect(uncorrected[1]?.adjustedPm25).toBe(110);

      // Test short dataset where tomorrow has zero windows
      const shortResult = computeRollingDiurnalWindows(data);
      expect(shortResult.cleanestToday).not.toBeNull();
      expect(shortResult.cleanestTomorrow).toBeNull();
      expect(shortResult.worstTomorrow).toBeNull();

      // Test data with temporal gap > 2 hours where windowPoints < 2 triggers continue
      const gappedData: DiurnalObservation[] = [
        { timestampIso: "2026-11-20T00:00:00Z", pm25: 100, pm10: 150 },
        { timestampIso: "2026-11-20T05:00:00Z", pm25: 120, pm10: 180 }, // 5 hours gap
        { timestampIso: "2026-11-20T06:00:00Z", pm25: 110, pm10: 170 }, // 1 hour gap
      ];
      const gappedResult = computeRollingDiurnalWindows(gappedData);
      expect(gappedResult.windows.length).toBe(1); // Only the 05:00-06:00 pair forms a valid 2h window
    });

    it("should process observations and flag humidity adjustments", () => {
      const data = generate48hData();
      const processed = processDiurnalObservations(data, true);
      expect(processed).toHaveLength(48);

      const highRhObs = processed.filter((p) => p.wasHumidityAdjusted);
      expect(highRhObs.length).toBeGreaterThan(0);
      expect(highRhObs[0]?.adjustedPm25).toBeLessThan(highRhObs[0]?.rawPm25 ?? 0);
    });

    it("should correctly identify cleanest and worst 2-hour windows for today and tomorrow", () => {
      const data = generate48hData();
      const result = computeRollingDiurnalWindows(data, {
        applyHumidityCorrection: true,
      });

      expect(result.windows.length).toBeGreaterThan(40);
      expect(result.cleanestToday).not.toBeNull();
      expect(result.worstToday).not.toBeNull();
      expect(result.cleanestTomorrow).not.toBeNull();
      expect(result.worstTomorrow).not.toBeNull();

      // Today's afternoon trough should be cleanest
      expect(result.cleanestToday?.averagePm25).toBeLessThanOrEqual(70);
      expect(result.cleanestToday?.day).toBe("today");

      // Today's morning peak should be worst
      expect(result.worstToday?.averagePm25).toBeGreaterThanOrEqual(100);
      expect(result.worstToday?.day).toBe("today");

      // Tomorrow's trough and peak
      expect(result.cleanestTomorrow?.day).toBe("tomorrow");
      expect(result.worstTomorrow?.day).toBe("tomorrow");
      expect(result.cleanestTomorrow?.averagePm25).toBeLessThan(
        result.worstTomorrow?.averagePm25 ?? Infinity,
      );
    });
  });

  describe("Hand-Worked Respiratory Dose Modeling", () => {
    const mockBaselineWindow: ExposureWindow = {
      startTimeIso: "2026-11-20T06:00:00Z",
      endTimeIso: "2026-11-20T08:00:00Z",
      day: "today",
      averagePm25: 200.0,
      rawAveragePm25: 200.0,
      averagePm10: 360.0,
      wasHumidityAdjusted: false,
      sampleCount: 2,
    };

    const mockShiftedWindow: ExposureWindow = {
      startTimeIso: "2026-11-20T14:00:00Z",
      endTimeIso: "2026-11-20T16:00:00Z",
      day: "today",
      averagePm25: 50.0,
      rawAveragePm25: 50.0,
      averagePm10: 90.0,
      wasHumidityAdjusted: false,
      sampleCount: 2,
    };

    it("should match hand-worked calculation for child_asthma (12 L/min)", () => {
      // Duration: 120 min
      // V_E = 12 L/min
      // Inhaled volume = 12 * 120 * 0.001 = 1.44 m³
      // Baseline Dose = 200 µg/m³ * 1.44 m³ = 288.0 µg
      // Shifted Dose = 50 µg/m³ * 1.44 m³ = 72.0 µg
      // Reduction = 288.0 - 72.0 = 216.0 µg
      // % Reduction = (216.0 / 288.0) * 100 = 75.0%
      const result = calculateRespiratoryDose(
        mockBaselineWindow,
        mockShiftedWindow,
        "child_asthma",
        120,
      );

      expect(result.minuteVentilationLpm).toBe(12.0);
      expect(result.activityDurationMinutes).toBe(120);
      expect(result.inhaledAirVolumeM3).toBe(1.44);
      expect(result.baselineDoseUg).toBe(288.0);
      expect(result.shiftedDoseUg).toBe(72.0);
      expect(result.reductionUg).toBe(216.0);
      expect(result.percentReduction).toBe(75.0);
      expect(result.clinicalSignificance).toContain("Exceptional: 75% reduction");
    });

    it("should match hand-worked calculation for older_adult_walker (18 L/min)", () => {
      // Inhaled volume = 18 * 120 * 0.001 = 2.16 m³
      // Baseline Dose = 200 * 2.16 = 432.0 µg
      // Shifted Dose = 50 * 2.16 = 108.0 µg
      // Reduction = 324.0 µg (75.0%)
      const result = calculateRespiratoryDose(
        mockBaselineWindow,
        mockShiftedWindow,
        "older_adult_walker",
        120,
      );

      expect(result.minuteVentilationLpm).toBe(18.0);
      expect(result.inhaledAirVolumeM3).toBe(2.16);
      expect(result.baselineDoseUg).toBe(432.0);
      expect(result.shiftedDoseUg).toBe(108.0);
      expect(result.reductionUg).toBe(324.0);
      expect(result.percentReduction).toBe(75.0);
    });

    it("should verify office_commuter and general_adult archetype profiles", () => {
      expect(HOUSEHOLD_ARCHETYPES.office_commuter.minuteVentilationLpm).toBe(20.0);
      expect(HOUSEHOLD_ARCHETYPES.general_adult.minuteVentilationLpm).toBe(15.0);

      const commuterResult = calculateRespiratoryDose(
        mockBaselineWindow,
        mockShiftedWindow,
        "office_commuter",
      );
      // Volume = 20 * 120 / 1000 = 2.4 m³
      // Baseline Dose = 200 * 2.4 = 480.0 µg
      expect(commuterResult.baselineDoseUg).toBe(480.0);
      expect(commuterResult.shiftedDoseUg).toBe(120.0);
      expect(commuterResult.reductionUg).toBe(360.0);
    });

    it("should handle clinical significance tiers for moderate (25-50%) and minor (<25%) reductions", () => {
      // 30% reduction window: baseline = 100, shifted = 70
      const w100: ExposureWindow = { ...mockBaselineWindow, averagePm25: 100 };
      const w70: ExposureWindow = { ...mockShiftedWindow, averagePm25: 70 };
      const res30 = calculateRespiratoryDose(w100, w70, "general_adult");
      expect(res30.percentReduction).toBe(30.0);
      expect(res30.clinicalSignificance).toContain(
        "Clinically Significant: 30% reduction",
      );

      // 10% reduction window: baseline = 100, shifted = 90
      const w90: ExposureWindow = { ...mockShiftedWindow, averagePm25: 90 };
      const res10 = calculateRespiratoryDose(w100, w90, "general_adult");
      expect(res10.percentReduction).toBe(10.0);
      expect(res10.clinicalSignificance).toContain("Moderate: 10% reduction");
    });

    it("should handle baselineDoseUg = 0 gracefully with 0% reduction", () => {
      const zeroBaseline: ExposureWindow = { ...mockBaselineWindow, averagePm25: 0 };
      const zeroShifted: ExposureWindow = { ...mockShiftedWindow, averagePm25: 0 };
      const zeroDose = calculateRespiratoryDose(
        zeroBaseline,
        zeroShifted,
        "general_adult",
      );
      expect(zeroDose.baselineDoseUg).toBe(0);
      expect(zeroDose.shiftedDoseUg).toBe(0);
      expect(zeroDose.percentReduction).toBe(0);
    });

    it("should find worst window when pollution rises later in the day", () => {
      const risingData: DiurnalObservation[] = [
        { timestampIso: "2026-11-20T00:00:00Z", pm25: 40, pm10: 70 },
        { timestampIso: "2026-11-20T01:00:00Z", pm25: 50, pm10: 80 },
        { timestampIso: "2026-11-20T02:00:00Z", pm25: 180, pm10: 290 },
        { timestampIso: "2026-11-20T03:00:00Z", pm25: 220, pm10: 350 },
      ];
      const res = computeRollingDiurnalWindows(risingData, {
        applyHumidityCorrection: false,
      });
      expect(res.cleanestToday?.averagePm25).toBeLessThan(100);
      expect(res.worstToday?.averagePm25).toBe(200);
      expect(res.humidityAdjustmentCount).toBe(0);
    });

    it("should sort unsorted timestamps and ignore invalid ISO dates", () => {
      const unsorted: DiurnalObservation[] = [
        { timestampIso: "invalid-date", pm25: 999, pm10: 999 },
        { timestampIso: "2026-11-20T03:00:00Z", pm25: 60, pm10: 100 },
        { timestampIso: "2026-11-20T04:00:00Z", pm25: 80, pm10: 120 },
        { timestampIso: "2026-11-20T00:00:00Z", pm25: 200, pm10: 300 },
        { timestampIso: "2026-11-20T01:00:00Z", pm25: 180, pm10: 280 },
      ];
      const res = computeRollingDiurnalWindows(unsorted);
      expect(res.windows.length).toBe(3);
      expect(res.worstToday?.averagePm25).toBe(190);
      expect(res.cleanestToday?.averagePm25).toBe(70);
    });
  });
});
