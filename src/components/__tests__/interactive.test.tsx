// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import VayuShieldHome from "@/app/page";
import { DiurnalPlanner, IndoorShelterCard, CommunityHub, ErrorBoundary } from "../index";
import {
  calculateCpcbAqi,
  calculateUsEpa2024Pm25Aqi,
  compareAqiScales,
  computeRollingDiurnalWindows,
  type DiurnalObservation,
} from "@/engine";

function makeObservations(basePm25 = 120): DiurnalObservation[] {
  const start = Date.parse("2026-11-20T00:00:00Z");
  return Array.from({ length: 48 }, (_, h) => ({
    timestampIso: new Date(start + h * 3600 * 1000).toISOString(),
    pm25: h % 24 >= 5 && h % 24 <= 8 ? basePm25 * 1.4 : basePm25 * 0.6,
    pm10: basePm25 * 1.8,
    humidityPct: h % 24 >= 5 && h % 24 <= 8 ? 82 : 50,
  }));
}

describe("Interactive UI Components, Hooks & Page Orchestration", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "en";
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("hydrates VayuShieldHome, syncs <html lang>, switches archetype with zero extra network calls, and recovers from corrupt localStorage", async () => {
    window.localStorage.setItem("vayushield_room_dims", "{broken-json");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const obs = makeObservations(90);
    const diurnal = computeRollingDiurnalWindows(obs);
    const cpcb = calculateCpcbAqi({ pm25: 51.1, pm10: 125.0 });
    const usEpa = calculateUsEpa2024Pm25Aqi(51.1);
    const comparison = compareAqiScales({ pm25: 51.1, pm10: 125.0 }, cpcb);

    const mockResponseBody = JSON.stringify({
      intelligence: {
        quantizedCoordinates: { lat: 28.69, lon: 76.97, gridKey: "agg:28.69,76.97" },
        currentConditions: {
          pm25: 51.1,
          pm10: 125.0,
          no2: 30,
          o3: 25,
          so2: 10,
          co: 0.7,
          cpcb,
          usEpa,
          satisfactoryIllusionAlert: comparison.satisfactoryIllusionAlert,
          scaleComparisonExplanation: comparison.explanation,
        },
        diurnalAnalysis: {
          observations48h: obs,
          cleanestToday: diurnal.cleanestToday,
          worstToday: diurnal.worstToday,
          cleanestTomorrow: diurnal.cleanestTomorrow,
          worstTomorrow: diurnal.worstTomorrow,
        },
        groundStation: null,
        upwindFireContext: {
          fireHotspotCount: 3,
          nearestFireKm: 55.2,
          windSpeedKmh: 11.0,
          windDirectionDeg: 315.0,
          alignment: "crosswind",
          scientificDisclaimer: "Disclaimer",
          attribution: "NASA FIRMS",
        },
        provenance: {
          primarySource: "open_meteo",
          stationSource: "none",
          firmsSource: "nasa_firms",
          quantizedLat: 28.69,
          quantizedLon: 76.97,
          gridKey: "agg:28.69,76.97",
          cachedAtIso: new Date().toISOString(),
          isCacheHit: false,
        },
        mandatoryAttributions: ["Open-Meteo"],
      },
      advisor: {
        output: {
          topActionIds: ["hepa_purifier_active"],
          familyBriefing: "Calm verified guidance without numbers.",
          rwaNoticeHeadline: "RWA Advisory",
          rwaNoticeBody: "Keep indoor filtration active.",
        },
        isFallback: false,
        executionDurationMs: 120,
      },
    });

    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(mockResponseBody, { status: 200 })),
      );
    globalThis.fetch = fetchMock;

    render(<VayuShieldHome />);

    await waitFor(() => {
      expect(screen.getByText("Dual-Scale Reading Note")).toBeTruthy();
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Switch archetype -> zero additional fetch calls, active profile badge updates
    fireEvent.click(screen.getByRole("button", { name: /Older Adult/i }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Active profile: Older Adult/i)).toBeTruthy();

    // City dropdown and quick preset trigger clean city change + refresh button works
    const citySelect = screen.getByLabelText(/Target City/i);
    fireEvent.change(citySelect, { target: { value: "pune_shivajinagar" } });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    const refreshBtn = screen.getByRole("button", { name: /Sync Live Data/i });
    fireEvent.click(refreshBtn);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    // Toggle language to Hindi -> <html lang="hi"> synced
    const langButtons = screen.getAllByRole("button", { name: /हिंदी में देखें/i });
    fireEvent.click(langButtons[0]!);
    await waitFor(() => {
      expect(document.documentElement.lang).toBe("hi");
    });
  }, 15_000);

  it("supports keyboard ArrowRight/ArrowLeft/Home/End navigation in DiurnalPlanner and resets selection on new series", () => {
    const obs1 = makeObservations(100);
    const diurnal1 = computeRollingDiurnalWindows(obs1);

    const { rerender } = render(
      <DiurnalPlanner
        observations48h={obs1}
        cleanestToday={diurnal1.cleanestToday}
        worstToday={diurnal1.worstToday}
        cleanestTomorrow={diurnal1.cleanestTomorrow}
        worstTomorrow={diurnal1.worstTomorrow}
        selectedArchetype="child_asthma"
        onArchetypeChange={() => {}}
        language="en"
      />,
    );

    const timelineGroup = screen.getByRole("group", {
      name: /48-hour hourly air quality timeline/i,
    });
    const bars = timelineGroup.querySelectorAll("button");
    expect(bars).toHaveLength(48);

    fireEvent.click(bars[0]!);
    expect(bars[0]!.getAttribute("aria-pressed")).toBe("true");

    fireEvent.keyDown(bars[0]!, { key: "ArrowRight" });
    expect(bars[1]!.getAttribute("aria-pressed")).toBe("true");

    fireEvent.keyDown(bars[1]!, { key: "End" });
    expect(bars[47]!.getAttribute("aria-pressed")).toBe("true");

    fireEvent.keyDown(bars[47]!, { key: "Home" });
    expect(bars[0]!.getAttribute("aria-pressed")).toBe("true");

    // Passing new observations48h clears stale selection
    const obs2 = makeObservations(140);
    const diurnal2 = computeRollingDiurnalWindows(obs2);
    rerender(
      <DiurnalPlanner
        observations48h={obs2}
        cleanestToday={diurnal2.cleanestToday}
        worstToday={diurnal2.worstToday}
        cleanestTomorrow={diurnal2.cleanestTomorrow}
        worstTomorrow={diurnal2.worstTomorrow}
        selectedArchetype="child_asthma"
        onArchetypeChange={() => {}}
        language="en"
      />,
    );
    const updatedBars = screen
      .getByRole("group", { name: /48-hour hourly air quality timeline/i })
      .querySelectorAll("button");
    expect(updatedBars[0]!.getAttribute("aria-pressed")).toBe("false");
  });

  it("handles NaN outdoorPm25 safely, updates sliders/combustion in IndoorShelterCard, and copies/switches transit in CommunityHub", async () => {
    const onDimsChange = vi.fn();
    render(
      <IndoorShelterCard
        outdoorPm25={Number.NaN}
        onRoomDimensionsChange={onDimsChange}
        language="en"
      />,
    );
    expect(screen.getByText(/Indoor Single-Zone Mass Balance/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Length \(m\):/i), {
      target: { value: "6.5" },
    });
    fireEvent.change(screen.getByLabelText(/Width \(m\):/i), {
      target: { value: "5.0" },
    });
    fireEvent.change(screen.getByLabelText(/Height \(m\):/i), {
      target: { value: "3.2" },
    });
    expect(onDimsChange).toHaveBeenCalledTimes(3);

    const incenseBtn = screen.getByRole("button", { name: /Incense Stick/i });
    fireEvent.click(incenseBtn);
    expect(incenseBtn.getAttribute("aria-pressed")).toBe("true");

    const writeTextMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Denied"))
      .mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<CommunityHub cpcbAqi={310} outdoorPm25={150} language="en" />);
    const metroBtn = screen.getByRole("button", { name: /Delhi Metro/i });
    expect(metroBtn.getAttribute("aria-pressed")).toBe("true");

    const wfhBtn = screen.getByRole("button", { name: /Work From Home/i });
    fireEvent.click(wfhBtn);
    expect(wfhBtn.getAttribute("aria-pressed")).toBe("true");

    fireEvent.change(screen.getByLabelText(/Round-Trip Distance/i), {
      target: { value: "30" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Copy RWA \/ School WhatsApp Advisory/i }),
    );
    await waitFor(() => {
      expect(screen.getByText(/Clipboard access blocked/i)).toBeTruthy();
    });
    expect(warnSpy).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: /Copy RWA \/ School WhatsApp Advisory/i }),
    );
    await waitFor(() => {
      expect(screen.getAllByText(/Copied to Clipboard!/i).length).toBeGreaterThan(0);
    });
  });

  it("recovers cleanly when ErrorBoundary catches a child render error", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;

    function FlakyWidget() {
      if (shouldThrow) {
        throw new Error("Simulated widget failure");
      }
      return <div>Recovered Widget</div>;
    }

    render(
      <ErrorBoundary fallbackTitle="Widget Recovery">
        <FlakyWidget />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Widget Recovery")).toBeTruthy();
    expect(errorSpy).toHaveBeenCalled();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry Panel" }));
    expect(screen.getByText("Recovered Widget")).toBeTruthy();
  });

  it("renders localized Hindi ErrorBoundary fallback when language='hi'", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function BrokenHindiWidget(): React.ReactNode {
      throw new Error("Simulated Hindi widget error");
    }

    render(
      <ErrorBoundary language="hi">
        <BrokenHindiWidget />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/पैनल पुनर्प्राप्ति/)).toBeTruthy();
    expect(screen.getByText(/इस मॉड्यूल में एक अप्रत्याशित गणना/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "पैनल पुनः प्रयास करें" })).toBeTruthy();
    expect(errorSpy).toHaveBeenCalled();
  });
});
