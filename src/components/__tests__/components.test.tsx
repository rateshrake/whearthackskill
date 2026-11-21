import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  DualScaleCard,
  DiurnalPlanner,
  IndoorShelterCard,
  UpwindContextCard,
  CommunityHub,
  AttributionFooter,
} from "../index";
import {
  calculateCpcbAqi,
  calculateUsEpa2024Pm25Aqi,
  type ExposureWindow,
  type DiurnalObservation,
} from "@/engine";
import type { GroundStationCheck, UpwindFireContext } from "@/services";

describe("Frontend UI Components Integration & Accessibility", () => {
  const dummyCpcb = calculateCpcbAqi({
    pm25: 48.0,
    pm10: 85.0,
    no2: 35.0,
    o3: 20.0,
    so2: 12.0,
    co: 0.8,
  });

  const dummyUsEpa = calculateUsEpa2024Pm25Aqi(48.0);

  const dummyCleanWindow: ExposureWindow = {
    startTimeIso: "2026-11-20T14:00:00Z",
    endTimeIso: "2026-11-20T16:00:00Z",
    day: "today",
    averagePm25: 45.0,
    rawAveragePm25: 45.0,
    averagePm10: 75.0,
    wasHumidityAdjusted: false,
    sampleCount: 3,
  };

  const dummyWorstWindow: ExposureWindow = {
    startTimeIso: "2026-11-20T06:00:00Z",
    endTimeIso: "2026-11-20T08:00:00Z",
    day: "today",
    averagePm25: 220.0,
    rawAveragePm25: 250.0,
    averagePm10: 340.0,
    wasHumidityAdjusted: true,
    sampleCount: 3,
  };

  const dummyObservations: DiurnalObservation[] = [
    { timestampIso: "2026-11-20T00:00:00Z", pm25: 120, pm10: 200, humidityPct: 65 },
    { timestampIso: "2026-11-20T06:00:00Z", pm25: 220, pm10: 340, humidityPct: 82 },
    { timestampIso: "2026-11-20T14:00:00Z", pm25: 45, pm10: 75, humidityPct: 40 },
    { timestampIso: "2026-11-20T20:00:00Z", pm25: 150, pm10: 250, humidityPct: 70 },
  ];

  const dummyStation: GroundStationCheck = {
    stationName: "Anand Vihar, Delhi - DPCC",
    originatingAgency: "DPCC / CPCB",
    stationAqi: 360,
    stationPm25: 180.0,
    cityModelPm25: 120.0,
    stationVsCitySkewPct: 50.0,
    classification: "micro_hotspot",
    attribution: "DPCC / CPCB Ground Station",
  };

  const dummyUpwindContext: UpwindFireContext = {
    fireHotspotCount: 42,
    nearestFireKm: 78.4,
    windSpeedKmh: 14.5,
    windDirectionDeg: 305.0,
    alignment: "upwind_aligned",
    scientificDisclaimer: "Methodological disclaimer",
    attribution: "NASA FIRMS VIIRS SNPP NRT",
  };

  describe("DualScaleCard", () => {
    it("renders dual scale comparison in English with satisfactory illusion alert", () => {
      const html = renderToString(
        <DualScaleCard
          cpcb={dummyCpcb}
          usEpa={dummyUsEpa}
          satisfactoryIllusionAlert={true}
          scaleExplanation="Discrepancy detected"
          groundStation={dummyStation}
          pm25Concentration={48.0}
          language="en"
        />,
      );

      expect(html).toContain("Dual-Scale Reality Check");
      expect(html).toContain("SATISFACTORY ILLUSION");
      expect(html).toContain("India CPCB National AQI");
      expect(html).toContain("US EPA May 2024 Revised AQI");
      expect(html).toContain("MICRO-HOTSPOT DETECTED");
      expect(html).toContain("aria-labelledby=\"dual-scale-heading\"");
    });

    it("renders dual scale comparison in Hindi", () => {
      const html = renderToString(
        <DualScaleCard
          cpcb={dummyCpcb}
          usEpa={dummyUsEpa}
          satisfactoryIllusionAlert={true}
          scaleExplanation="Discrepancy detected"
          groundStation={null}
          pm25Concentration={48.0}
          language="hi"
        />,
      );

      expect(html).toContain("द्वि-पैमाना वास्तविकता जांच");
      expect(html).toContain("संतोषजनक वायु का भ्रम");
      expect(html).toContain("भारत CPCB राष्ट्रीय एक्यूआई");
    });
  });

  describe("DiurnalPlanner", () => {
    it("renders clean vs worst windows, timeline, and dose reduction in English", () => {
      const html = renderToString(
        <DiurnalPlanner
          observations48h={dummyObservations}
          cleanestToday={dummyCleanWindow}
          worstToday={dummyWorstWindow}
          cleanestTomorrow={null}
          worstTomorrow={null}
          selectedArchetype="child_asthma"
          onArchetypeChange={() => {}}
          language="en"
        />,
      );

      expect(html).toContain("48-Hour Diurnal Clean-Air Window Optimizer");
      expect(html).toContain("Cleanest Window (Today)");
      expect(html).toContain("Worst Peak Window (Today)");
      expect(html).toContain("Pulmonary Inhaled Dose Comparison");
      expect(html).toContain("Child with Asthma");
      expect(html).toContain("aria-labelledby=\"diurnal-planner-heading\"");
      expect(html).toContain("aria-live=\"polite\"");
    });

    it("renders in Hindi with proper typography", () => {
      const html = renderToString(
        <DiurnalPlanner
          observations48h={dummyObservations}
          cleanestToday={dummyCleanWindow}
          worstToday={dummyWorstWindow}
          cleanestTomorrow={null}
          worstTomorrow={null}
          selectedArchetype="older_adult_walker"
          onArchetypeChange={() => {}}
          language="hi"
        />,
      );

      expect(html).toContain("48-घंटे स्वच्छ-हवा दैनिक समय अनुकूलक");
      expect(html).toContain("आज का सबसे स्वच्छ समय");
      expect(html).toContain("फेफड़ों में जाने वाले PM2.5 कणों की तुलना");
    });
  });

  describe("IndoorShelterCard", () => {
    it("renders steady-state infiltration regimes and required CADR sizing in English", () => {
      const html = renderToString(
        <IndoorShelterCard
          outdoorPm25={180.0}
          initialRoomDimensions={{ lengthMeters: 5.0, widthMeters: 4.0, heightMeters: 2.8 }}
          language="en"
        />,
      );

      expect(html).toContain("Indoor Single-Zone Mass Balance Shelter Audit");
      expect(html).toContain("Required CADR (m³/h)");
      expect(html).toContain("Open Windows Baseline");
      expect(html).toContain("Closed Windows + Sized HEPA Purifier");
      expect(html).toContain("Acute Indoor Combustion Spike Estimator");
      expect(html).toContain("Mosquito Repellent Coil");
    });

    it("renders in Hindi", () => {
      const html = renderToString(
        <IndoorShelterCard
          outdoorPm25={180.0}
          initialRoomDimensions={{ lengthMeters: 4.0, widthMeters: 3.5, heightMeters: 3.0 }}
          language="hi"
        />,
      );

      expect(html).toContain("इनडोर शेल्टर एवं घरेलू दहन सुरक्षा ऑडिट");
      expect(html).toContain("कमरे का आकार व वायु आयतन");
      expect(html).toContain("घरेलू धुएं (Combustion) का खतरा");
    });
  });

  describe("UpwindContextCard", () => {
    it("renders upwind fire alignment and meteorological vectors in English", () => {
      const html = renderToString(
        <UpwindContextCard
          upwindContext={dummyUpwindContext}
          language="en"
        />,
      );

      expect(html).toContain("Upwind Satellite Thermal Anomalies &amp; Meteorology");
      expect(html).toContain("Active Regional Fires");
      expect(html).toContain("42");
      expect(html).toContain("78.4 km");
      expect(html).toContain("14.5");
      expect(html).toContain("km/h");
      expect(html).toContain("Upwind Plume Aligned");
      expect(html).toContain("UPWIND ALIGNED:");
    });

    it("renders crosswind and none_detected alignments cleanly", () => {
      const crosswindHtml = renderToString(
        <UpwindContextCard
          upwindContext={{ ...dummyUpwindContext, alignment: "crosswind" }}
          language="en"
        />,
      );
      expect(crosswindHtml).toContain("Crosswind / Lateral Dispersion");

      const noneHtml = renderToString(
        <UpwindContextCard
          upwindContext={{ ...dummyUpwindContext, alignment: "none_detected" }}
          language="en"
        />,
      );
      expect(noneHtml).toContain("No Direct Upwind Plume");
    });
  });

  describe("CommunityHub", () => {
    it("renders GRAP Stage mandates and commute savings simulator in English", () => {
      const html = renderToString(
        <CommunityHub
          cpcbAqi={350}
          outdoorPm25={180.0}
          language="en"
        />,
      );

      expect(html).toContain("Community &amp; Society Smog Action Hub");
      expect(html).toContain("Stage II");
      expect(html).toContain("Very Poor");
      expect(html).toContain("Citizen Protection &amp; Action Checklist");
      expect(html).toContain("RWA / Housing Society Enforcement Mandate");
      expect(html).toContain("Neighborhood Transit &amp; Carpool Savings Simulator");
      expect(html).toContain("Copy RWA / School WhatsApp Advisory");
      expect(html).toContain("Share on WhatsApp");
      expect(html).toContain("Share on Telegram");
      expect(html).toContain("011-23701213");
    });

    it("renders statutory mandates in Hindi", () => {
      const html = renderToString(
        <CommunityHub
          cpcbAqi={425}
          outdoorPm25={260.0}
          language="hi"
        />,
      );

      expect(html).toContain("सामुदायिक व आरडब्ल्यूए (RWA) ग्रैप एक्शन हब");
      expect(html).toContain("नागरिक स्वास्थ्य सुरक्षा चेकलिस्ट");
      expect(html).toContain("सोसायटी व आरडब्ल्यूए के लिए वैधानिक नियम");
    });
  });

  describe("AttributionFooter", () => {
    it("renders all mandatory scientific and agency credits", () => {
      const html = renderToString(<AttributionFooter language="en" />);

      expect(html).toContain("Open-Meteo &amp; CAMS");
      expect(html).toContain("WAQI &amp; CPCB");
      expect(html).toContain("NASA FIRMS");
      expect(html).toContain("OpenAQ Community");
      expect(html).toContain("Google Maps Platform");
      expect(html).toContain("Medical Disclaimer");
      expect(html).toContain("PromptWars Virtual Challenge 6");
    });

    it("renders attributions in Hindi", () => {
      const html = renderToString(<AttributionFooter language="hi" />);

      expect(html).toContain("डेटा स्रोत व वैज्ञानिक आभार");
      expect(html).toContain("Medical Disclaimer");
    });
  });
});
