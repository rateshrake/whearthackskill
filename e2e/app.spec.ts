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

/**
 * Fixture Factory for Deterministic Intelligence Payloads
 */
function createDeterministicFixture(scenario: "severe_delhi" | "satisfactory_illusion"): {
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
    const scaleComparison = compareAqiScales(pm25);

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
        quantizedCoordinates: { lat: 28.69, lon: 76.97, gridKey: "28.69_76.97" },
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
          gridKey: "28.69_76.97",
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
  } else {
    // Scenario B: Satisfactory Illusion in Pune/Hyderabad
    const pm25 = 48.0;
    const pm10 = 75.0;
    const no2 = 25.0;
    const o3 = 20.0;
    const so2 = 10.0;
    const co = 0.6;

    const cpcb = calculateCpcbAqi({ pm25, pm10, no2, o3, so2, co });
    const usEpa = calculateUsEpa2024Pm25Aqi(pm25);
    const scaleComparison = compareAqiScales(pm25);

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
        quantizedCoordinates: { lat: 17.44, lon: 78.38, gridKey: "17.44_78.38" },
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
          gridKey: "17.44_78.38",
          cachedAtIso: new Date().toISOString(),
          isCacheHit: false,
        },
        mandatoryAttributions: ["Open-Meteo CC BY 4.0", "WAQI", "NASA FIRMS"],
      },
      advisor: {
        output: {
          topActionIds: ["hepa_purifier_continuous", "shift_outdoor_hours"],
          familyBriefing:
            "CRITICAL: Local CPCB scale rates conditions as Satisfactory (AQI 80), but tightened US EPA 2024 epidemiological standards classify this air as Unhealthy for Sensitive Groups (AQI 132). Vulnerable family members must avoid vigorous outdoor exertion.",
          rwaNoticeHeadline: "RWA NOTICE: SENSITIVE POPULATION CLEAN-AIR ADVISORY",
          rwaNoticeBody:
            "Residents are notified that while local indices appear moderate, international standards indicate heightened inflammatory risks for asthmatic children.",
        },
        isFallback: false,
        executionDurationMs: 380,
      },
    };
  }
}

test.describe("VayuShield E2E & Accessibility Hardening Suite", () => {
  test.beforeEach(async ({ context, page }) => {
    // Grant clipboard permissions for automated test execution
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    page.on("pageerror", (err) => {
      throw new Error(`Uncaught browser pageerror: ${err.message}`);
    });
  });

  test("Scenario A: Severe Delhi Winter Smog (GRAP Stage IV, Upwind Fires, Zero-Latency Controls, Zero Axe Violations)", async ({
    page,
  }) => {
    let networkCallCount = 0;
    const failedAssetResponses: string[] = [];

    page.on("response", (res) => {
      if (res.url().startsWith("http://localhost:3000") && res.status() >= 400) {
        failedAssetResponses.push(`${res.status()} ${res.url()}`);
      }
    });

    // Intercept /api/intelligence with deterministic Severe Delhi payload
    await page.route("**/api/intelligence*", async (route) => {
      networkCallCount++;
      const fixture = createDeterministicFixture("severe_delhi");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixture),
      });
    });

    // 1. Load application
    const responsePromise = page.waitForResponse((res) =>
      res.url().includes("/api/intelligence"),
    );
    await page.goto("/");
    await responsePromise;
    await expect(page.locator("h1")).toContainText("VayuShield");
    expect(networkCallCount).toBe(1);

    // 2. Verify Module 1: DualScaleCard
    const dualScaleSection = page.locator(
      'section[aria-labelledby="dual-scale-heading"]',
    );
    await expect(dualScaleSection).toBeVisible();
    await expect(dualScaleSection).toContainText("India CPCB National AQI");
    await expect(dualScaleSection).toContainText("US EPA May 2024 Revised AQI");
    await expect(dualScaleSection).toContainText("MICRO-HOTSPOT DETECTED");

    // 3. Verify Module 2: DiurnalPlanner & Zero-Latency Archetype Recalculation
    const diurnalSection = page.locator(
      'section[aria-labelledby="diurnal-planner-heading"]',
    );
    await expect(diurnalSection).toBeVisible();
    await expect(diurnalSection).toContainText(
      "48-Hour Diurnal Clean-Air Window Optimizer",
    );
    await expect(diurnalSection).toContainText("Pulmonary Inhaled Dose Comparison");

    // Click Archetype: Older Adult (Morning Walker)
    const olderAdultBtn = page.locator("#archetype-btn-older_adult_walker");
    await olderAdultBtn.click();
    await expect(olderAdultBtn).toHaveAttribute("aria-pressed", "true");

    // Verify pulmonary dose updated synchronously without extra network calls
    expect(networkCallCount).toBe(1);
    await expect(diurnalSection).toContainText("Older Adult (Morning Walker)");

    // 4. Verify Module 3: IndoorShelterCard & Zero-Latency CADR / Combustion Spikes
    const indoorSection = page.locator(
      'section[aria-labelledby="indoor-shelter-heading"]',
    );
    await expect(indoorSection).toBeVisible();
    await expect(indoorSection).toContainText(
      "Indoor Single-Zone Mass Balance Shelter Audit",
    );
    await expect(indoorSection).toContainText("Required CADR (m³/h)");

    // Adjust Room Length Slider
    const lengthInput = indoorSection.locator('input[type="range"]').first();
    await lengthInput.fill("7.0");
    // Verify room volume and required CADR recalculate synchronously
    expect(networkCallCount).toBe(1);

    // Switch Combustion Trigger to Unvented Frying
    const fryingBtn = page.locator("#combustion-btn-unvented_frying");
    await fryingBtn.click();
    await expect(fryingBtn).toHaveAttribute("aria-pressed", "true");
    await expect(indoorSection).toContainText("Unvented High-Heat Frying / Tadka");
    expect(networkCallCount).toBe(1);

    // 5. Verify Module 4: UpwindContextCard
    const upwindSection = page.locator(
      'section[aria-labelledby="upwind-context-heading"]',
    );
    await expect(upwindSection).toBeVisible();
    await expect(upwindSection).toContainText("68");
    await expect(upwindSection).toContainText("42.5 km");
    await expect(upwindSection).toContainText("Upwind Plume Aligned");

    // 6. Verify Module 5: CommunityHub & Clipboard Copy
    const communitySection = page.locator(
      'section[aria-labelledby="community-hub-heading"]',
    );
    await expect(communitySection).toBeVisible();
    await expect(communitySection).toContainText("Community & Society Smog Action Hub");
    await expect(communitySection).toContainText("GRAP");

    // Click "Copy RWA / School WhatsApp Advisory"
    const copyBtn = communitySection.locator(
      'button:has-text("Copy RWA / School WhatsApp Advisory")',
    );
    await copyBtn.click();
    await expect(communitySection).toContainText("Copied to Clipboard!");

    // 7. Verify AttributionFooter
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("Open-Meteo & CAMS");
    await expect(footer).toContainText("WAQI & CPCB");

    // 8. Verify zero failed local asset responses (including /favicon.ico) and run Axe Accessibility Scan
    const faviconRes = await page.request.get("/favicon.ico");
    expect(faviconRes.status()).toBe(200);
    expect(failedAssetResponses).toEqual([]);

    const axeResults = await new AxeBuilder({ page }).analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test("Scenario B: Satisfactory Illusion & Bilingual Hindi Mode (Zero Axe Violations)", async ({
    page,
  }) => {
    // Intercept /api/intelligence with deterministic Satisfactory Illusion payload
    await page.route("**/api/intelligence*", async (route) => {
      const fixture = createDeterministicFixture("satisfactory_illusion");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixture),
      });
    });

    // 1. Load application
    const responsePromise = page.waitForResponse((res) =>
      res.url().includes("/api/intelligence"),
    );
    await page.goto("/");
    await responsePromise;

    // 2. Assert Critical "Satisfactory Illusion" Banner is rendered
    const illusionAlert = page
      .locator('section[aria-labelledby="dual-scale-heading"]')
      .getByRole("alert");
    await expect(illusionAlert).toBeVisible();
    await expect(illusionAlert).toContainText("SATISFACTORY ILLUSION");

    // 3. Run Axe Accessibility Scan on Satisfactory Illusion State
    const axeResultsEn = await new AxeBuilder({ page }).analyze();
    expect(axeResultsEn.violations).toEqual([]);

    // 4. Switch Language to Hindi
    const langBtn = page.locator('button[aria-label="हिंदी में देखें"]:visible');
    await langBtn.click();

    // 5. Assert Hindi Headlines & Typography
    await expect(page.locator("h1")).toContainText("वायुशील्ड");
    await expect(
      page.locator('section[aria-labelledby="dual-scale-heading"] h2'),
    ).toContainText("द्वि-पैमाना वास्तविकता जांच");
    await expect(
      page.locator('section[aria-labelledby="diurnal-planner-heading"] h2'),
    ).toContainText("48-घंटे स्वच्छ-हवा दैनिक समय अनुकूलक");
    await expect(
      page.locator('section[aria-labelledby="indoor-shelter-heading"] h2'),
    ).toContainText("इनडोर शेल्टर एवं घरेलू दहन सुरक्षा ऑडिट");

    // 6. Run Axe Accessibility Scan on Hindi State
    const axeResultsHi = await new AxeBuilder({ page }).analyze();
    expect(axeResultsHi.violations).toEqual([]);
  });
});
