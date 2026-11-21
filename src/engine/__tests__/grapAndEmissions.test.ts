import { describe, it, expect } from "vitest";
import {
  mapAqiToGrapStage,
  calculateCommuteDeltas,
  GRAP_STAGES,
  COMMUTE_MODE_PROFILES,
} from "../grapAndEmissions";

describe("Module 4: grapAndEmissions", () => {
  describe("Delhi-NCR GRAP Mapping & Action Checklists", () => {
    it("should map AQI <= 200 to Stage 0 (Normal Baseline)", () => {
      const stage0 = mapAqiToGrapStage(150);
      expect(stage0.stage).toBe("stage_0");
      expect(stage0.severityLabel).toBe("Normal");
      expect(stage0.citizenChecklist).toHaveLength(1);
    });

    it("should map AQI 201-300 to Stage I ('Poor')", () => {
      const stage1_lower = mapAqiToGrapStage(201);
      const stage1_upper = mapAqiToGrapStage(300);
      expect(stage1_lower.stage).toBe("stage_1");
      expect(stage1_upper.stage).toBe("stage_1");
      expect(stage1_lower.severityLabel).toBe("Poor");
      expect(stage1_lower.statutoryRestrictions).toContain(
        "Heavy fines on open burning of municipal solid waste and biomass",
      );
      expect(
        stage1_lower.citizenChecklist.some((c) =>
          c.action.includes("Turn off vehicle engine"),
        ),
      ).toBe(true);
    });

    it("should map AQI 301-400 to Stage II ('Very Poor')", () => {
      const stage2_lower = mapAqiToGrapStage(301);
      const stage2_upper = mapAqiToGrapStage(400);
      expect(stage2_lower.stage).toBe("stage_2");
      expect(stage2_upper.stage).toBe("stage_2");
      expect(stage2_lower.severityLabel).toBe("Very Poor");
      expect(stage2_lower.statutoryRestrictions).toContain(
        "Ban on diesel generator sets across all sectors (except emergency essential services)",
      );
      expect(
        stage2_lower.rwaChecklist.some((r) => r.action.includes("electric room heaters")),
      ).toBe(true);
    });

    it("should map AQI 401-450 to Stage III ('Severe')", () => {
      const stage3_lower = mapAqiToGrapStage(401);
      const stage3_upper = mapAqiToGrapStage(450);
      expect(stage3_lower.stage).toBe("stage_3");
      expect(stage3_upper.stage).toBe("stage_3");
      expect(stage3_lower.severityLabel).toBe("Severe");
      expect(
        stage3_lower.statutoryRestrictions.some((s) =>
          s.includes("BS-III petrol and BS-IV diesel"),
        ),
      ).toBe(true);
      expect(
        stage3_lower.citizenChecklist.some((c) => c.action.includes("N95/FFP2")),
      ).toBe(true);
    });

    it("should map AQI > 450 to Stage IV ('Severe+')", () => {
      const stage4_lower = mapAqiToGrapStage(451);
      const stage4_extreme = mapAqiToGrapStage(500);
      expect(stage4_lower.stage).toBe("stage_4");
      expect(stage4_extreme.stage).toBe("stage_4");
      expect(stage4_lower.severityLabel).toBe("Severe+");
      expect(
        stage4_lower.statutoryRestrictions.some((s) =>
          s.includes("Ban on entry of non-essential trucks"),
        ),
      ).toBe(true);
      expect(
        stage4_lower.rwaChecklist.some((r) => r.action.includes("clean-air shelters")),
      ).toBe(true);
    });

    it("should ensure all GRAP stages have color codes and checklists", () => {
      for (const key of Object.keys(GRAP_STAGES) as Array<keyof typeof GRAP_STAGES>) {
        const item = GRAP_STAGES[key];
        expect(item.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(item.citizenChecklist.length).toBeGreaterThan(0);
        expect(item.rwaChecklist.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Commute Emission & Exposure Deltas", () => {
    it("should match hand-worked calculation for Metro vs Private Car (20 km round-trip, 150 µg/m³ ambient)", () => {
      // Distance: 20 km, Ambient PM2.5: 150 µg/m³
      //
      // Private Car:
      // CO2 = 20 * 160 = 3200.0 g
      // Duration = (20 / 20) * 60 = 60 min
      // In-transit PM2.5 = 150 * 0.35 = 52.5 µg/m³
      // Inhaled air volume = 12 L/min * 60 min / 1000 = 0.72 m³
      // Inhaled PM2.5 = 52.5 * 0.72 = 37.8 µg
      //
      // Metro Transit:
      // CO2 = 20 * 18 = 360.0 g
      // Duration = (20 / 32) * 60 = 37.5 min
      // In-transit PM2.5 = 150 * 0.30 = 45.0 µg/m³
      // Inhaled air volume = 15 L/min * 37.5 min / 1000 = 0.5625 m³
      // Inhaled PM2.5 = 45.0 * 0.5625 = 25.31 µg
      //
      // Delta:
      // CO2 avoided = 3200 - 360 = 2840.0 g (88.8% reduction)
      // PM2.5 avoided = 37.8 - 25.31 = 12.49 µg (33.0% reduction)
      const result = calculateCommuteDeltas(
        20,
        150,
        "metro_transit",
        "private_petrol_car",
      );

      expect(result.baseline.co2EmissionsGrams).toBe(3200.0);
      expect(result.baseline.transitDurationMinutes).toBe(60.0);
      expect(result.baseline.inTransitPm25UgM3).toBe(52.5);
      expect(result.baseline.inhaledPm25Ug).toBe(37.8);

      expect(result.chosen.co2EmissionsGrams).toBe(360.0);
      expect(result.chosen.transitDurationMinutes).toBe(37.5);
      expect(result.chosen.inTransitPm25UgM3).toBe(45.0);
      expect(result.chosen.inhaledPm25Ug).toBe(25.31);

      expect(result.delta.co2AvoidedGrams).toBe(2840.0);
      expect(result.delta.co2ReductionPct).toBe(88.8);
      expect(result.delta.pm25InhaledAvoidedUg).toBe(12.49);
      expect(result.delta.pm25ReductionPct).toBe(33.0);
      expect(result.summary).toContain("saves 2840 g of CO2 (88.8% reduction)");
    });

    it("should match hand-worked calculation for Work From Home vs Private Car", () => {
      // WFH:
      // CO2 = 0 g
      // Commute transit duration = 0 min
      // Inhaled PM2.5 = 0 µg commute dose
      // Delta: 100% CO2 reduction, 100% commute PM2.5 avoided
      const wfhResult = calculateCommuteDeltas(
        25,
        180,
        "work_from_home",
        "private_petrol_car",
      );

      expect(wfhResult.chosen.co2EmissionsGrams).toBe(0);
      expect(wfhResult.chosen.inhaledPm25Ug).toBe(0);
      expect(wfhResult.delta.co2ReductionPct).toBe(100.0);
      expect(wfhResult.delta.pm25ReductionPct).toBe(100.0);
    });

    it("should expose hazardous pulmonary dose of Two-Wheeler commute", () => {
      // Two-Wheeler has 1.25 microenvironment factor and 18 L/min breathing rate:
      // Distance = 10 km, Ambient = 200 µg/m³
      // In-transit PM2.5 = 200 * 1.25 = 250 µg/m³
      // Duration = (10 / 24) * 60 = 25 min
      // Air volume = 18 * 25 / 1000 = 0.45 m³
      // Inhaled PM2.5 = 250 * 0.45 = 112.5 µg
      const twoWheeler = calculateCommuteDeltas(10, 200, "two_wheeler", "metro_transit");

      expect(twoWheeler.chosen.inTransitPm25UgM3).toBe(250.0);
      expect(twoWheeler.chosen.inhaledPm25Ug).toBe(112.5);
      // Metro has much lower exposure, so switching from two-wheeler to metro saves PM2.5
      const switchFromBikeToMetro = calculateCommuteDeltas(
        10,
        200,
        "metro_transit",
        "two_wheeler",
      );
      expect(switchFromBikeToMetro.delta.pm25InhaledAvoidedUg).toBeGreaterThan(50.0);
      expect(switchFromBikeToMetro.delta.pm25ReductionPct).toBeGreaterThan(70.0);
    });

    it("should handle 0 km edge case safely", () => {
      const zeroKm = calculateCommuteDeltas(
        0,
        100,
        "metro_transit",
        "private_petrol_car",
      );
      expect(zeroKm.delta.co2AvoidedGrams).toBe(0);
      expect(zeroKm.delta.pm25InhaledAvoidedUg).toBe(0);
      expect(zeroKm.delta.co2ReductionPct).toBe(0);
    });

    it("should export all commute mode profiles with valid parameters", () => {
      for (const mode of Object.keys(COMMUTE_MODE_PROFILES) as Array<
        keyof typeof COMMUTE_MODE_PROFILES
      >) {
        const p = COMMUTE_MODE_PROFILES[mode];
        expect(p.co2GramsPerKm).toBeGreaterThanOrEqual(0);
        expect(p.microenvironmentPenetrationFactor).toBeGreaterThan(0);
        expect(p.minuteVentilationLpm).toBeGreaterThan(0);
      }
    });
  });
});
