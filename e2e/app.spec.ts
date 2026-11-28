import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  calculateCpcbAqi,
  calculateUsEpa2024Pm25Aqi,
  compareAqiScales,
  computeRollingDiurnalWindows,
  type DiurnalObservation,
} from "../src/engine";
import type { AirIntelligencePayload } from "../src/services/airQualityAggregator";
import type { AdvisorExecutionResult } from "../src/services/geminiAdvisor";

type ScenarioName = "severe_delhi" | "satisfactory_illusion" | "moderate_pm10";

/**
 * Fixture Factory for Deterministic Intelligence Payloads
 */
function createDeterministicFixture(scenario: ScenarioName): {
  intelligence: AirIntelligencePayload;
  advisor: AdvisorExecutionResult;
} {
  if (scenario === "severe_delhi") {
    const pm25 = 240.0;
    const pm10 = 380.0;
    const no2 = 85.0;
    const o3 = 45.0;
    const so2 = 30.0;
    const co = 2.4;

    const cpcb = calculateCpcbAqi({ pm25, pm10, no2, o3, so2, co });
    const usEpa = calculateUsEpa2024Pm25Aqi(pm25);
    const scaleComparison = compareAqiScales({ pm25, pm10, no2, o3, so2, co }, cpcb);

    const baseTime = new Date("2026-11-20T00:00:00Z");
    const observations: DiurnalObservation[] = [];
    for (let h = 0; h < 48; h++) {
      const t = new Date(baseTime.getTime() + h * 3600 * 1000).toISOString();
      const hourOfDay = h % 24;
      let hourlyPm25 = 160.0;
      let hourlyRh = 65.0;
      if (hourOfDay >= 5 && hourOfDay <= 8) {
        hourlyPm25 = 310.0;
        hourlyRh = 86.0;
      } else if (hourOfDay >= 13 && hourOfDay <= 16) {
        hourlyPm25 = 110.0;
        hourlyRh = 45.0;
      }
      observations.push({
        timestampIso: t,
        pm25: hourlyPm25,
        pm10: hourlyPm25 * 1.6,
        humidityPct: hourlyRh,
      });
    }

    const diurnalAnalysis = computeRollingDiurnalWindows(observations, {
      applyHumidityCorrection: true,
    });

    return {
      intelligence: {
        quantizedCoordinates: { lat: 28.69, lon: 76.97, gridKey: "agg:28.69,76.97" },
        currentConditions: {
          pm25,
          pm10,
          no2,
          o3,
          so2,
          co,
          cpcb,
          usEpa,
          satisfactoryIllusionAlert: scaleComparison.satisfactoryIllusionAlert,
          scaleComparisonExplanation: scaleComparison.explanation,
        },
        diurnalAnalysis: {
          observations48h: observations,
          cleanestToday: diurnalAnalysis.cleanestToday,
          worstToday: diurnalAnalysis.worstToday,
          cleanestTomorrow: diurnalAnalysis.cleanestTomorrow,
          worstTomorrow: diurnalAnalysis.worstTomorrow,
        },
        groundStation: {
          stationName: "Tikri Kalan Industrial Border - DPCC",
          originatingAgency: "DPCC / CPCB",
          stationAqi: 395,
          stationPm25: 255.0,
          cityModelPm25: 180.0,
          stationVsCitySkewPct: 41.7,
          classification: "micro_hotspot",
          attribution: "DPCC / CPCB Ground Reference Monitor",
        },
        upwindFireContext: {
          fireHotspotCount: 68,
          nearestFireKm: 42.5,
          windSpeedKmh: 18.2,
          windDirectionDeg: 305.0,
          alignment: "upwind_aligned",
          scientificDisclaimer: "Methodological satellite attribution notice.",
          attribution: "NASA FIRMS (VIIRS SNPP NRT / EOSDIS)",
        },
        provenance: {
          primarySource: "open_meteo",
          stationSource: "waqi",
          firmsSource: "nasa_firms",
          quantizedLat: 28.69,
          quantizedLon: 76.97,
          gridKey: "agg:28.69,76.97",
          cachedAtIso: new Date().toISOString(),
          isCacheHit: false,
        },
        mandatoryAttributions: [
          "Open-Meteo & CAMS CC BY 4.0",
          "WAQI & CPCB Ground Stations",
          "NASA FIRMS",
        ],
      },
      advisor: {
        output: {
          topActionIds: [
            "respirator_mask_seal",
            "hepa_purifier_continuous",
            "shift_outdoor_hours",
          ],
          familyBriefing:
            "Severe toxic particulate loading detected across the Delhi-NCR airshed. High-risk vulnerability protocol active: cancel all outdoor exertion during morning nocturnal inversion peak. Operate indoor HEPA purifiers continuously.",
          rwaNoticeHeadline: "RWA NOTICE: GRAP STAGE IV STATUTORY PROTOCOL ENFORCED",
          rwaNoticeBody:
            "In compliance with statutory CAQM directives: 1. Complete ban on diesel generator sets. 2. Electric heaters mandatory for night security guards. 3. Ban on dry sweeping.",
        },
        isFallback: false,
        executionDurationMs: 420,
      },
    };
  }

  if (scenario === "moderate_pm10") {
    // Scenario C: PM10-dominated Moderate CPCB (117 Moderate) vs US EPA (139 USG)
    const pm25 = 51.1;
    const pm10 = 125.0;
    const no2 = 30.0;
    const o3 = 22.0;
    const so2 = 11.0;
    const co = 0.7;

    const cpcb = calculateCpcbAqi({ pm25, pm10, no2, o3, so2, co });
    const usEpa = calculateUsEpa2024Pm25Aqi(pm25);
    const scaleComparison = compareAqiScales({ pm25, pm10, no2, o3, so2, co }, cpcb);

    const baseTime = new Date("2026-11-20T00:00:00Z");
    const observations: DiurnalObservation[] = [];
    for (let h = 0; h < 48; h++) {
      const t = new Date(baseTime.getTime() + h * 3600 * 1000).toISOString();
      const hourOfDay = h % 24;
      let hourlyPm25 = 48.0;
      if (hourOfDay >= 6 && hourOfDay <= 9) hourlyPm25 = 72.0;
      if (hourOfDay >= 14 && hourOfDay <= 17) hourlyPm25 = 35.0;

      observations.push({
        timestampIso: t,
        pm25: hourlyPm25,
        pm10: hourlyPm25 * 2.1,
        humidityPct: 65.0,
      });
    }

    const diurnalAnalysis = computeRollingDiurnalWindows(observations, {
      applyHumidityCorrection: true,
    });

    return {
      intelligence: {
        quantizedCoordinates: { lat: 18.53, lon: 73.85, gridKey: "agg:18.53,73.85" },
        currentConditions: {
          pm25,
          pm10,
          no2,
          o3,
          so2,
          co,
          cpcb,
          usEpa,
          satisfactoryIllusionAlert: scaleComparison.satisfactoryIllusionAlert,
          scaleComparisonExplanation: scaleComparison.explanation,
        },
        diurnalAnalysis: {
          observations48h: observations,
          cleanestToday: diurnalAnalysis.cleanestToday,
          worstToday: diurnalAnalysis.worstToday,
          cleanestTomorrow: diurnalAnalysis.cleanestTomorrow,
          worstTomorrow: diurnalAnalysis.worstTomorrow,
        },
        groundStation: null,
        upwindFireContext: {
          fireHotspotCount: 0,
          nearestFireKm: null,
          windSpeedKmh: 10.5,
          windDirectionDeg: 280.0,
          alignment: "none_detected",
          scientificDisclaimer: "Methodological satellite attribution notice.",
          attribution: "NASA FIRMS",
        },
        provenance: {
          primarySource: "open_meteo",
          stationSource: "none",
          firmsSource: "none",
          quantizedLat: 18.53,
          quantizedLon: 73.85,
          gridKey: "agg:18.53,73.85",
          cachedAtIso: new Date().toISOString(),
          isCacheHit: false,
        },
        mandatoryAttributions: ["Open-Meteo CC BY 4.0", "NASA FIRMS"],
      },
      advisor: {
        output: {
          topActionIds: ["hepa_purifier_continuous", "shift_outdoor_hours"],
          familyBriefing:
            "Moderate coarse-particulate conditions noted. Sensitive family members should pace outdoor activities during peak traffic hours and rely on indoor filtration.",
          rwaNoticeHeadline: "RWA CLEAN-AIR ADVISORY",
          rwaNoticeBody:
            "Maintain periodic water sprinkling on internal roads to suppress coarse dust.",
        },
        isFallback: false,
        executionDurationMs: 280,
      },
    };
  }

  // Scenario B: Satisfactory Illusion in Hyderabad
  const pm25 = 48.0;
  const pm10 = 75.0;
  const no2 = 25.0;
  const o3 = 20.0;
  const so2 = 10.0;
  const co = 0.6;

  const cpcb = calculateCpcbAqi({ pm25, pm10, no2, o3, so2, co });
  const usEpa = calculateUsEpa2024Pm25Aqi(pm25);
  const scaleComparison = compareAqiScales({ pm25, pm10, no2, o3, so2, co }, cpcb);

  const baseTime = new Date("2026-11-20T00:00:00Z");
  const observations: DiurnalObservation[] = [];
  for (let h = 0; h < 48; h++) {
    const t = new Date(baseTime.getTime() + h * 3600 * 1000).toISOString();
    const hourOfDay = h % 24;
    let hourlyPm25 = 45.0;
    if (hourOfDay >= 6 && hourOfDay <= 9) hourlyPm25 = 68.0;
    if (hourOfDay >= 14 && hourOfDay <= 17) hourlyPm25 = 32.0;

    observations.push({
      timestampIso: t,
      pm25: hourlyPm25,
      pm10: hourlyPm25 * 1.6,
      humidityPct: 50.0,
    });
  }

  const diurnalAnalysis = computeRollingDiurnalWindows(observations, {
    applyHumidityCorrection: true,
  });

  return {
    intelligence: {
      quantizedCoordinates: { lat: 17.44, lon: 78.38, gridKey: "agg:17.44,78.38" },
      currentConditions: {
        pm25,
        pm10,
        no2,
        o3,
        so2,
        co,
        cpcb,
        usEpa,
        satisfactoryIllusionAlert: scaleComparison.satisfactoryIllusionAlert,
        scaleComparisonExplanation: scaleComparison.explanation,
      },
      diurnalAnalysis: {
        observations48h: observations,
        cleanestToday: diurnalAnalysis.cleanestToday,
        worstToday: diurnalAnalysis.worstToday,
        cleanestTomorrow: diurnalAnalysis.cleanestTomorrow,
        worstTomorrow: diurnalAnalysis.worstTomorrow,
      },
      groundStation: {
        stationName: "Hyderabad HITEC City - TSPCB",
        originatingAgency: "TSPCB / CPCB",
        stationAqi: 82,
        stationPm25: 49.5,
        cityModelPm25: 48.0,
        stationVsCitySkewPct: 3.1,
        classification: "consistent",
        attribution: "TSPCB Reference Station",
      },
      upwindFireContext: {
        fireHotspotCount: 0,
        nearestFireKm: null,
        windSpeedKmh: 9.0,
        windDirectionDeg: 140.0,
        alignment: "none_detected",
        scientificDisclaimer: "Methodological satellite attribution notice.",
        attribution: "NASA FIRMS",
      },
      provenance: {
        primarySource: "open_meteo",
        stationSource: "waqi",
        firmsSource: "nasa_firms",
        quantizedLat: 17.44,
        quantizedLon: 78.38,
        gridKey: "agg:17.44,78.38",
        cachedAtIso: new Date().toISOString(),
        isCacheHit: false,
      },
      mandatoryAttributions: ["Open-Meteo CC BY 4.0", "WAQI", "NASA FIRMS"],
    },
    advisor: {
      output: {
        topActionIds: ["hepa_purifier_continuous", "shift_outdoor_hours"],
        familyBriefing:
          "Local CPCB scale rates conditions as Satisfactory, while tightened US EPA epidemiological standards classify fine particles as Unhealthy for Sensitive Groups. Vulnerable family members should pace outdoor exertion gently.",
        rwaNoticeHeadline: "RWA NOTICE: SENSITIVE POPULATION CLEAN-AIR ADVISORY",
        rwaNoticeBody:
          "Residents are notified that international standards indicate heightened sensitivity for asthmatic children.",
      },
      isFallback: false,
      executionDurationMs: 380,
    },
  };
}

test.describe("VayuShield E2E, Security Headers, CSP & Accessibility Hardening Suite", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    page.on("pageerror", (err) => {
      throw new Error(`Uncaught browser pageerror: ${err.message}`);
    });
  });

  test("Scenario A: Severe Delhi Winter Smog (Zero-Latency Controls, Security Headers, Zero CSP/Axe Violations)", async ({
    page,
  }) => {
    let networkCallCount = 0;
    const failedAssetResponses: string[] = [];
    const cspViolations: string[] = [];

    await page.addInitScript(() => {
      (window as unknown as { __cspViolations: string[] }).__cspViolations = [];
      window.addEventListener("securitypolicyviolation", (e) => {
        (window as unknown as { __cspViolations: string[] }).__cspViolations.push(
          `${e.violatedDirective}:${e.blockedURI}`,
        );
      });
    });

    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        msg.text().toLowerCase().includes("content security policy")
      ) {
        cspViolations.push(msg.text());
      }
    });

    page.on("response", (res) => {
      if (res.url().startsWith("http://localhost:3000") && res.status() >= 400) {
        failedAssetResponses.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.route("**/api/intelligence*", async (route) => {
      networkCallCount++;
      const fixture = createDeterministicFixture("severe_delhi");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixture),
      });
    });

    const responsePromise = page.waitForResponse((res) =>
      res.url().includes("/api/intelligence"),
    );
    const docResponse = await page.goto("/");
    expect(docResponse).not.toBeNull();
    expect(docResponse?.headers()["x-powered-by"]).toBeUndefined();
    const docCsp = docResponse?.headers()["content-security-policy"] ?? "";
    expect(docCsp).toContain("worker-src 'none'");
    expect(docCsp).toContain("img-src 'self' data:");

    await responsePromise;
    await expect(page.locator("h1")).toContainText("VayuShield");
    expect(networkCallCount).toBe(1);

    const dualScaleSection = page.locator(
      'section[aria-labelledby="dual-scale-heading"]',
    );
    await expect(dualScaleSection).toBeVisible();
    await expect(dualScaleSection).toContainText("India CPCB National AQI");
    await expect(dualScaleSection).toContainText("US EPA May 2024 Revised AQI");
    await expect(dualScaleSection).toContainText("MICRO-HOTSPOT DETECTED");

    const diurnalSection = page.locator(
      'section[aria-labelledby="diurnal-planner-heading"]',
    );
    await expect(diurnalSection).toBeVisible();
    const olderAdultBtn = page.locator("#archetype-btn-older_adult_walker");
    await olderAdultBtn.click();
    await expect(olderAdultBtn).toHaveAttribute("aria-pressed", "true");
    expect(networkCallCount).toBe(1);
    await expect(diurnalSection).toContainText("Older Adult (Morning Walker)");

    // Keyboard navigation on 48h timeline bars
    const firstBar = diurnalSection
      .getByRole("group", { name: /48-hour hourly air quality timeline/i })
      .locator("button")
      .first();
    await firstBar.focus();
    await firstBar.press("ArrowRight");
    await expect(
      diurnalSection.getByRole("status").filter({ hasText: /PM2\.5:/ }),
    ).toBeVisible();

    const indoorSection = page.locator(
      'section[aria-labelledby="indoor-shelter-heading"]',
    );
    const lengthInput = indoorSection.locator('input[type="range"]').first();
    await lengthInput.fill("7.0");
    expect(networkCallCount).toBe(1);

    const fryingBtn = page.locator("#combustion-btn-unvented_frying");
    await fryingBtn.click();
    await expect(fryingBtn).toHaveAttribute("aria-pressed", "true");
    expect(networkCallCount).toBe(1);

    const communitySection = page.locator(
      'section[aria-labelledby="community-hub-heading"]',
    );
    const copyBtn = communitySection.locator(
      'button:has-text("Copy RWA / School WhatsApp Advisory")',
    );
    await copyBtn.click();
    await expect(communitySection).toContainText("Copied to Clipboard!");

    const faviconRes = await page.request.get("/favicon.ico");
    expect(faviconRes.status()).toBe(200);
    expect(failedAssetResponses).toEqual([]);

    const recordedViolations = await page.evaluate(
      () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
    );
    expect([...cspViolations, ...recordedViolations]).toEqual([]);

    const axeResults = await new AxeBuilder({ page }).analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test("Scenario B: Peaceful Flat Scale Note & Bilingual Hindi Mode (<html lang='hi'>, Zero Axe Violations)", async ({
    page,
  }) => {
    await page.route("**/api/intelligence*", async (route) => {
      const fixture = createDeterministicFixture("satisfactory_illusion");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixture),
      });
    });

    const responsePromise = page.waitForResponse((res) =>
      res.url().includes("/api/intelligence"),
    );
    await page.goto("/");
    await responsePromise;

    const dualScaleSection = page.locator(
      'section[aria-labelledby="dual-scale-heading"]',
    );
    // Requirement R3: NO role="alert" warning banner; peaceful flat <aside> instead
    await expect(dualScaleSection.getByRole("alert")).toHaveCount(0);

    const calmNote = dualScaleSection.locator(
      'aside[aria-labelledby="scale-comparison-note-heading"]',
    );
    await expect(calmNote).toBeVisible();
    await expect(calmNote).toContainText("Dual-Scale Reading Note");
    await expect(calmNote).not.toContainText("CRITICAL");
    await expect(calmNote).not.toContainText("SATISFACTORY ILLUSION");
    await expect(calmNote).toContainText("80");
    await expect(calmNote).toContainText("Satisfactory");
    await expect(calmNote).toContainText("132");

    const noteStyles = await calmNote.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        boxShadow: style.boxShadow,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
      };
    });
    expect(noteStyles.boxShadow).toBe("none");

    const axeResultsEn = await new AxeBuilder({ page }).analyze();
    expect(axeResultsEn.violations).toEqual([]);

    // Switch Language to Hindi and verify <html lang="hi"> sync
    const langBtn = page.locator('button[aria-label="हिंदी में देखें"]:visible');
    await langBtn.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await expect(page.locator("h1")).toContainText("वायुशील्ड");
    await expect(calmNote).toContainText("द्वि-स्तरीय पैमाना नोट");

    const axeResultsHi = await new AxeBuilder({ page }).analyze();
    expect(axeResultsHi.violations).toEqual([]);
  });

  test("Scenario C: Moderate PM10-Dominated AQI (117 Moderate vs 139 USG consistency & >=4.5:1 badge contrast in EN + HI)", async ({
    page,
  }) => {
    await page.route("**/api/intelligence*", async (route) => {
      const fixture = createDeterministicFixture("moderate_pm10");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixture),
      });
    });

    const responsePromise = page.waitForResponse((res) =>
      res.url().includes("/api/intelligence"),
    );
    await page.goto("/");
    await responsePromise;

    const dualScaleSection = page.locator(
      'section[aria-labelledby="dual-scale-heading"]',
    );
    const calmNote = dualScaleSection.locator(
      'aside[aria-labelledby="scale-comparison-note-heading"]',
    );
    await expect(calmNote).toBeVisible();
    await expect(calmNote).toContainText("117");
    await expect(calmNote).toContainText("Moderate");
    await expect(calmNote).toContainText("139");
    await expect(calmNote).toContainText("Unhealthy for Sensitive Groups");
    await expect(calmNote).not.toContainText("85");
    await expect(calmNote).not.toContainText("Satisfactory");

    const boxShadow = await calmNote.evaluate(
      (el) => window.getComputedStyle(el).boxShadow,
    );
    expect(boxShadow).toBe("none");

    // Verify Moderate badge + all controls pass Axe contrast checks in English & Hindi
    const axeEn = await new AxeBuilder({ page }).analyze();
    expect(axeEn.violations).toEqual([]);

    const langBtn = page.locator('button[aria-label="हिंदी में देखें"]:visible');
    await langBtn.click();
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");

    const axeHi = await new AxeBuilder({ page }).analyze();
    expect(axeHi.violations).toEqual([]);
  });
});
