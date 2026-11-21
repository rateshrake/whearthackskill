import { describe, it, expect } from "vitest";
import {
  calculateCpcbSubIndex,
  calculateCpcbAqi,
  calculateUsEpa2024Pm25Aqi,
  compareAqiScales,
  classifyCpcbAqi,
  classifyUsEpaAqi,
  COLOR_BLIND_SAFE_TOKENS,
} from "../aqiBreakpoints";

describe("Module 1: aqiBreakpoints", () => {
  describe("CPCB PM2.5 Breakpoints & Piecewise Linear Interpolation", () => {
    it("should calculate exact lower and upper boundaries of Good tier (0-30 µg/m³ -> 0-50)", () => {
      const at0 = calculateCpcbSubIndex("PM2.5", 0);
      expect(at0.subIndex).toBe(0);
      expect(at0.category).toBe("Good");
      expect(at0.isCapped).toBe(false);

      const at15 = calculateCpcbSubIndex("PM2.5", 15);
      expect(at15.subIndex).toBe(25);
      expect(at15.category).toBe("Good");

      const at30 = calculateCpcbSubIndex("PM2.5", 30);
      expect(at30.subIndex).toBe(50);
      expect(at30.category).toBe("Good");
    });

    it("should calculate exact boundaries of Satisfactory tier (31-60 µg/m³ -> 51-100)", () => {
      const at31 = calculateCpcbSubIndex("PM2.5", 31);
      expect(at31.subIndex).toBe(51);
      expect(at31.category).toBe("Satisfactory");

      const at45 = calculateCpcbSubIndex("PM2.5", 45);
      expect(at45.subIndex).toBeGreaterThanOrEqual(74);
      expect(at45.subIndex).toBeLessThanOrEqual(76);
      expect(at45.category).toBe("Satisfactory");

      const at60 = calculateCpcbSubIndex("PM2.5", 60);
      expect(at60.subIndex).toBe(100);
      expect(at60.category).toBe("Satisfactory");
    });

    it("should calculate exact boundaries of Moderate tier (61-90 µg/m³ -> 101-200)", () => {
      const at61 = calculateCpcbSubIndex("PM2.5", 61);
      expect(at61.subIndex).toBe(101);
      expect(at61.category).toBe("Moderate");

      const at90 = calculateCpcbSubIndex("PM2.5", 90);
      expect(at90.subIndex).toBe(200);
      expect(at90.category).toBe("Moderate");
    });

    it("should calculate exact boundaries of Poor tier (91-120 µg/m³ -> 201-300)", () => {
      const at91 = calculateCpcbSubIndex("PM2.5", 91);
      expect(at91.subIndex).toBe(201);
      expect(at91.category).toBe("Poor");

      const at120 = calculateCpcbSubIndex("PM2.5", 120);
      expect(at120.subIndex).toBe(300);
      expect(at120.category).toBe("Poor");
    });

    it("should calculate exact boundaries of Very Poor tier (121-250 µg/m³ -> 301-400)", () => {
      const at121 = calculateCpcbSubIndex("PM2.5", 121);
      expect(at121.subIndex).toBe(301);
      expect(at121.category).toBe("Very Poor");

      const at250 = calculateCpcbSubIndex("PM2.5", 250);
      expect(at250.subIndex).toBe(400);
      expect(at250.category).toBe("Very Poor");
    });

    it("should calculate exact boundaries of Severe tier (251-380 µg/m³ -> 401-500)", () => {
      const at251 = calculateCpcbSubIndex("PM2.5", 251);
      expect(at251.subIndex).toBe(401);
      expect(at251.category).toBe("Severe");

      const at380 = calculateCpcbSubIndex("PM2.5", 380);
      expect(at380.subIndex).toBe(500);
      expect(at380.category).toBe("Severe");
      expect(at380.isCapped).toBe(false);
      expect(at380.isUncappedRawSeverity).toBe(false);
    });

    it("should cap at 500 and flag uncapped raw severity when PM2.5 > 380 µg/m³", () => {
      const at450 = calculateCpcbSubIndex("PM2.5", 450);
      expect(at450.subIndex).toBe(500);
      expect(at450.rawSubIndex).toBeGreaterThan(500);
      expect(at450.isCapped).toBe(true);
      expect(at450.isUncappedRawSeverity).toBe(true);
      expect(at450.category).toBe("Severe");

      const at600 = calculateCpcbSubIndex("PM2.5", 600);
      expect(at600.subIndex).toBe(500);
      expect(at600.rawSubIndex).toBeGreaterThan(600);
      expect(at600.isCapped).toBe(true);
      expect(at600.isUncappedRawSeverity).toBe(true);
    });
  });

  describe("CPCB Other Pollutants Sub-indices", () => {
    it("should correctly compute PM10 sub-indices and boundaries", () => {
      expect(calculateCpcbSubIndex("PM10", 50).subIndex).toBe(50);
      expect(calculateCpcbSubIndex("PM10", 100).subIndex).toBe(100);
      expect(calculateCpcbSubIndex("PM10", 250).subIndex).toBe(200);
      expect(calculateCpcbSubIndex("PM10", 350).subIndex).toBe(300);
      expect(calculateCpcbSubIndex("PM10", 430).subIndex).toBe(400);
      expect(calculateCpcbSubIndex("PM10", 500).subIndex).toBe(500);
      expect(calculateCpcbSubIndex("PM10", 600).subIndex).toBe(500);
      expect(calculateCpcbSubIndex("PM10", 600).isCapped).toBe(true);
    });

    it("should correctly compute NO2 sub-indices and boundaries", () => {
      expect(calculateCpcbSubIndex("NO2", 40).subIndex).toBe(50);
      expect(calculateCpcbSubIndex("NO2", 80).subIndex).toBe(100);
      expect(calculateCpcbSubIndex("NO2", 180).subIndex).toBe(200);
      expect(calculateCpcbSubIndex("NO2", 280).subIndex).toBe(300);
      expect(calculateCpcbSubIndex("NO2", 400).subIndex).toBe(400);
      expect(calculateCpcbSubIndex("NO2", 800).subIndex).toBe(500);
    });

    it("should correctly compute O3 sub-indices and boundaries", () => {
      expect(calculateCpcbSubIndex("O3", 50).subIndex).toBe(50);
      expect(calculateCpcbSubIndex("O3", 100).subIndex).toBe(100);
      expect(calculateCpcbSubIndex("O3", 168).subIndex).toBe(200);
      expect(calculateCpcbSubIndex("O3", 208).subIndex).toBe(300);
      expect(calculateCpcbSubIndex("O3", 748).subIndex).toBe(400);
      expect(calculateCpcbSubIndex("O3", 1000).subIndex).toBe(500);
    });

    it("should correctly compute SO2 sub-indices and boundaries", () => {
      expect(calculateCpcbSubIndex("SO2", 40).subIndex).toBe(50);
      expect(calculateCpcbSubIndex("SO2", 80).subIndex).toBe(100);
      expect(calculateCpcbSubIndex("SO2", 380).subIndex).toBe(200);
      expect(calculateCpcbSubIndex("SO2", 800).subIndex).toBe(300);
      expect(calculateCpcbSubIndex("SO2", 1600).subIndex).toBe(400);
      expect(calculateCpcbSubIndex("SO2", 2100).subIndex).toBe(500);
    });

    it("should correctly compute CO sub-indices and boundaries", () => {
      expect(calculateCpcbSubIndex("CO", 1.0).subIndex).toBe(50);
      expect(calculateCpcbSubIndex("CO", 2.0).subIndex).toBe(100);
      expect(calculateCpcbSubIndex("CO", 10.0).subIndex).toBe(200);
      expect(calculateCpcbSubIndex("CO", 17.0).subIndex).toBe(300);
      expect(calculateCpcbSubIndex("CO", 34.0).subIndex).toBe(400);
      expect(calculateCpcbSubIndex("CO", 50.0).subIndex).toBe(500);
    });

    it("should calculate multi-pollutant CPCB AQI based on max sub-index", () => {
      const result = calculateCpcbAqi({
        pm25: 75, // Moderate (~150)
        pm10: 450, // Severe (>400)
        no2: 50, // Satisfactory
      });
      expect(result.criticalPollutant).toBe("PM10");
      expect(result.category).toBe("Severe");
      expect(result.aqi).toBeGreaterThanOrEqual(400);
      expect(result.subIndices["PM2.5"]).toBeDefined();
      expect(result.subIndices["PM10"]).toBeDefined();

      // Test extreme multi-pollutant with capping and uncapped raw severity flag
      const extremeResult = calculateCpcbAqi({
        pm25: 450, // PM2.5 > 380: capped at 500, uncappedRawSeverity = true
        pm10: 550, // PM10 > 500: capped at 500
      });
      expect(extremeResult.aqi).toBe(500);
      expect(extremeResult.isCapped).toBe(true);
      expect(extremeResult.isUncappedRawSeverity).toBe(true);
    });
  });

  describe("US EPA May 2024 Revised PM2.5 AQI", () => {
    it("should implement tightened 9.0 µg/m³ Good boundary", () => {
      const at0 = calculateUsEpa2024Pm25Aqi(0.0);
      expect(at0.aqi).toBe(0);
      expect(at0.category).toBe("Good");

      const at4_5 = calculateUsEpa2024Pm25Aqi(4.5);
      expect(at4_5.aqi).toBe(25);
      expect(at4_5.category).toBe("Good");

      const at9_0 = calculateUsEpa2024Pm25Aqi(9.0);
      expect(at9_0.aqi).toBe(50);
      expect(at9_0.category).toBe("Good");
    });

    it("should implement Moderate band (9.1 - 35.4 µg/m³ -> 51 - 100)", () => {
      const at9_1 = calculateUsEpa2024Pm25Aqi(9.1);
      expect(at9_1.aqi).toBe(51);
      expect(at9_1.category).toBe("Moderate");

      const at35_4 = calculateUsEpa2024Pm25Aqi(35.4);
      expect(at35_4.aqi).toBe(100);
      expect(at35_4.category).toBe("Moderate");
    });

    it("should implement Unhealthy for Sensitive Groups band (35.5 - 55.4 µg/m³ -> 101 - 150)", () => {
      const at35_5 = calculateUsEpa2024Pm25Aqi(35.5);
      expect(at35_5.aqi).toBe(101);
      expect(at35_5.category).toBe("Unhealthy for Sensitive Groups");

      const at45_45 = calculateUsEpa2024Pm25Aqi(45.45);
      expect(at45_45.aqi).toBeGreaterThanOrEqual(124);
      expect(at45_45.aqi).toBeLessThanOrEqual(126);
      expect(at45_45.category).toBe("Unhealthy for Sensitive Groups");

      const at55_4 = calculateUsEpa2024Pm25Aqi(55.4);
      expect(at55_4.aqi).toBe(150);
      expect(at55_4.category).toBe("Unhealthy for Sensitive Groups");
    });

    it("should implement Unhealthy band (55.5 - 125.4 µg/m³ -> 151 - 200)", () => {
      const at55_5 = calculateUsEpa2024Pm25Aqi(55.5);
      expect(at55_5.aqi).toBe(151);
      expect(at55_5.category).toBe("Unhealthy");

      const at125_4 = calculateUsEpa2024Pm25Aqi(125.4);
      expect(at125_4.aqi).toBe(200);
      expect(at125_4.category).toBe("Unhealthy");
    });

    it("should implement Very Unhealthy band (125.5 - 225.4 µg/m³ -> 201 - 300)", () => {
      const at125_5 = calculateUsEpa2024Pm25Aqi(125.5);
      expect(at125_5.aqi).toBe(201);
      expect(at125_5.category).toBe("Very Unhealthy");

      const at225_4 = calculateUsEpa2024Pm25Aqi(225.4);
      expect(at225_4.aqi).toBe(300);
      expect(at225_4.category).toBe("Very Unhealthy");
    });

    it("should implement Hazardous band (225.5 - 325.4 µg/m³ -> 301 - 400 and beyond)", () => {
      const at225_5 = calculateUsEpa2024Pm25Aqi(225.5);
      expect(at225_5.aqi).toBe(301);
      expect(at225_5.category).toBe("Hazardous");

      const at325_4 = calculateUsEpa2024Pm25Aqi(325.4);
      expect(at325_4.aqi).toBe(400);
      expect(at325_4.category).toBe("Hazardous");

      const at500_4 = calculateUsEpa2024Pm25Aqi(500.4);
      expect(at500_4.aqi).toBe(500);
      expect(at500_4.category).toBe("Hazardous");

      const at600 = calculateUsEpa2024Pm25Aqi(600);
      expect(at600.aqi).toBe(500);
      expect(at600.rawAqi).toBeGreaterThan(500);
      expect(at600.isCapped).toBe(true);
      expect(at600.isUncappedRawSeverity).toBe(true);
    });
  });

  describe("compareAqiScales & Satisfactory Illusion Alert", () => {
    it("should trigger satisfactoryIllusionAlert when CPCB is Satisfactory while US EPA is USG (35.5 - 55.4 µg/m³)", () => {
      const comparison36 = compareAqiScales(36.0);
      expect(comparison36.cpcb.category).toBe("Satisfactory");
      expect(comparison36.usEpa.category).toBe("Unhealthy for Sensitive Groups");
      expect(comparison36.satisfactoryIllusionAlert).toBe(true);
      expect(comparison36.explanation).toContain(
        'CRITICAL ALERT: "Satisfactory Illusion"',
      );

      const comparison50 = compareAqiScales(50.0);
      expect(comparison50.cpcb.category).toBe("Satisfactory");
      expect(comparison50.usEpa.category).toBe("Unhealthy for Sensitive Groups");
      expect(comparison50.satisfactoryIllusionAlert).toBe(true);
    });

    it("should trigger satisfactoryIllusionAlert when CPCB is Satisfactory while US EPA is Unhealthy (55.5 - 60.0 µg/m³)", () => {
      const comparison58 = compareAqiScales(58.0);
      expect(comparison58.cpcb.category).toBe("Satisfactory");
      expect(comparison58.usEpa.category).toBe("Unhealthy");
      expect(comparison58.satisfactoryIllusionAlert).toBe(true);
      expect(comparison58.explanation).toContain("CRITICAL ALERT");
    });

    it("should NOT trigger alert when CPCB is already Moderate or worse (e.g. 75 µg/m³)", () => {
      const comparison75 = compareAqiScales(75.0);
      expect(comparison75.cpcb.category).toBe("Moderate");
      expect(comparison75.usEpa.category).toBe("Unhealthy");
      expect(comparison75.satisfactoryIllusionAlert).toBe(false);
    });

    it("should handle divergence explanations when CPCB is higher or when indices converge", () => {
      // At severe PM2.5 = 250 µg/m³, CPCB = 400, EPA = ~325. Divergence delta < 0
      const at250 = compareAqiScales(250.0);
      expect(at250.divergenceDelta).toBeLessThan(0);
      expect(at250.explanation).toContain("CPCB index is");

      // At PM2.5 = 0, both are 0. Divergence delta = 0
      const at0 = compareAqiScales(0);
      expect(at0.divergenceDelta).toBe(0);
      expect(at0.explanation).toContain("Both indices converge");

      // At PM2.5 = 20, EPA is ~68, CPCB is ~33. Divergence delta > 0, but no Satisfactory Illusion
      const at20 = compareAqiScales(20.0);
      expect(at20.divergenceDelta).toBeGreaterThan(0);
      expect(at20.explanation).toContain("more conservative than CPCB");
    });

    it("should handle empty concentrations object gracefully in calculateCpcbAqi", () => {
      const emptyResult = calculateCpcbAqi({});
      expect(emptyResult.aqi).toBe(0);
      expect(emptyResult.category).toBe("Good");
    });

    it("should provide valid color-blind-safe tokens for all categories", () => {
      expect(COLOR_BLIND_SAFE_TOKENS.Good.hex).toBe("#009E73");
      expect(COLOR_BLIND_SAFE_TOKENS.Satisfactory.hex).toBe("#56B4E9");
      expect(COLOR_BLIND_SAFE_TOKENS.Moderate.hex).toBe("#E69F00");
      expect(COLOR_BLIND_SAFE_TOKENS["Unhealthy for Sensitive Groups"].hex).toBe(
        "#D55E00",
      );
      expect(COLOR_BLIND_SAFE_TOKENS.Unhealthy.hex).toBe("#CC79A7");
      expect(COLOR_BLIND_SAFE_TOKENS["Very Unhealthy"].hex).toBe("#7828C8");
      expect(COLOR_BLIND_SAFE_TOKENS.Hazardous.hex).toBe("#7F0000");
    });

    it("should correctly classify helper boundary functions", () => {
      expect(classifyCpcbAqi(40)).toBe("Good");
      expect(classifyCpcbAqi(90)).toBe("Satisfactory");
      expect(classifyCpcbAqi(150)).toBe("Moderate");
      expect(classifyCpcbAqi(250)).toBe("Poor");
      expect(classifyCpcbAqi(350)).toBe("Very Poor");
      expect(classifyCpcbAqi(450)).toBe("Severe");

      expect(classifyUsEpaAqi(30)).toBe("Good");
      expect(classifyUsEpaAqi(75)).toBe("Moderate");
      expect(classifyUsEpaAqi(120)).toBe("Unhealthy for Sensitive Groups");
      expect(classifyUsEpaAqi(180)).toBe("Unhealthy");
      expect(classifyUsEpaAqi(250)).toBe("Very Unhealthy");
      expect(classifyUsEpaAqi(400)).toBe("Hazardous");
    });
  });
});
