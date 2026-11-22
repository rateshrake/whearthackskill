"use client";

import React, { useState, useEffect, useRef, useId, useCallback } from "react";
import {
  CITY_PRESETS,
  DICTIONARY,
  type SupportedLanguage,
  type CityPreset,
} from "@/i18n/dictionary";
import {
  DualScaleCard,
  DiurnalPlanner,
  IndoorShelterCard,
  UpwindContextCard,
  CommunityHub,
  AttributionFooter,
} from "@/components";
import type { AirIntelligencePayload } from "@/services/airQualityAggregator";
import type { AdvisorExecutionResult } from "@/services/geminiAdvisor";
import type { HouseholdArchetype, RoomDimensions } from "@/engine";
import {
  RefreshCw,
  Globe,
  Radio,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Stethoscope,
  Activity,
} from "lucide-react";

export default function VayuShieldHome() {
  // 1. Local State with Safe Defaults
  const [selectedCityId, setSelectedCityId] = useState<string>("delhi_tikri");
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [selectedArchetype, setSelectedArchetype] =
    useState<HouseholdArchetype>("child_asthma");
  const [roomDimensions, setRoomDimensions] = useState<RoomDimensions>({
    lengthMeters: 5.0,
    widthMeters: 4.0,
    heightMeters: 2.8,
  });

  // 2. Intelligence & Advisor API State
  const [intelligence, setIntelligence] = useState<AirIntelligencePayload | null>(null);
  const [advisor, setAdvisor] = useState<AdvisorExecutionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const citySelectId = useId();
  const t = DICTIONARY[language];

  // Active City
  const activeCity: CityPreset =
    CITY_PRESETS.find((c) => c.id === selectedCityId) ?? CITY_PRESETS[0]!;

  // 3. Load Persistent State from localStorage on Mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(
        "vayushield_lang",
      ) as SupportedLanguage | null;
      if (savedLang === "en" || savedLang === "hi") {
        setLanguage(savedLang);
      }

      const savedCity = localStorage.getItem("vayushield_city");
      if (savedCity && CITY_PRESETS.some((c) => c.id === savedCity)) {
        setSelectedCityId(savedCity);
      }

      const savedArch = localStorage.getItem(
        "vayushield_archetype",
      ) as HouseholdArchetype | null;
      if (
        savedArch === "child_asthma" ||
        savedArch === "older_adult_walker" ||
        savedArch === "office_commuter" ||
        savedArch === "general_adult"
      ) {
        setSelectedArchetype(savedArch);
      }

      const savedDims = localStorage.getItem("vayushield_room_dims");
      if (savedDims) {
        const parsed = JSON.parse(savedDims);
        if (
          typeof parsed.lengthMeters === "number" &&
          typeof parsed.widthMeters === "number" &&
          typeof parsed.heightMeters === "number"
        ) {
          setRoomDimensions(parsed);
        }
      }
    } catch {
      // Ignore localStorage read errors in restricted contexts
    }
  }, []);

  // 4. Save State Changes to localStorage
  const handleLanguageToggle = () => {
    const nextLang: SupportedLanguage = language === "en" ? "hi" : "en";
    setLanguage(nextLang);
    try {
      localStorage.setItem("vayushield_lang", nextLang);
    } catch {}
  };

  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    try {
      localStorage.setItem("vayushield_city", cityId);
    } catch {}
  };

  const handleArchetypeChange = (arch: HouseholdArchetype) => {
    setSelectedArchetype(arch);
    try {
      localStorage.setItem("vayushield_archetype", arch);
    } catch {}
  };

  const handleRoomDimensionsChange = (dims: RoomDimensions) => {
    setRoomDimensions(dims);
    try {
      localStorage.setItem("vayushield_room_dims", JSON.stringify(dims));
    } catch {}
  };

  const archetypeRef = useRef<HouseholdArchetype>(selectedArchetype);
  useEffect(() => {
    archetypeRef.current = selectedArchetype;
  }, [selectedArchetype]);

  // 5. Fetch Environmental Intelligence from /api/intelligence
  const fetchIntelligence = useCallback(
    async (city: CityPreset, lang: SupportedLanguage) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          lat: city.lat.toString(),
          lon: city.lon.toString(),
          lang,
          archetype: archetypeRef.current,
        });

        const res = await fetch(`/api/intelligence?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Upstream API responded with HTTP ${res.status}`);
        }

        const data = (await res.json()) as {
          intelligence: AirIntelligencePayload;
          advisor: AdvisorExecutionResult;
        };

        setIntelligence(data.intelligence);
        setAdvisor(data.advisor);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load air data";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Trigger fetch on mount or when city/language changes (habit adjustments are zero-latency pure client-side)
  useEffect(() => {
    fetchIntelligence(activeCity, language);
  }, [activeCity, language, fetchIntelligence]);

  return (
    <div className="min-h-screen bg-[#08090d] text-neutral-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white atmospheric-bg">
      {/* Skip Navigation Link for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-sky-500 focus:text-black focus:font-bold focus:rounded-md focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* High-Precision Instrument Header */}
      <header className="border-b border-white/[0.08] bg-[#0c0e14]/90 backdrop-blur-xl sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Wordmark & Subtitle */}
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.1] text-sky-400">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>{t.app.title}</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.06] text-neutral-400 border border-white/[0.08]">
                    v1.0
                  </span>
                </h1>
                <p className="text-[11px] text-neutral-400 font-mono tracking-tight">
                  {t.app.subtitle}
                </p>
              </div>
            </div>

            {/* Language Toggle for Mobile */}
            <button
              type="button"
              onClick={handleLanguageToggle}
              className="md:hidden px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-white/[0.04] border border-white/[0.1] text-neutral-300 hover:text-white flex items-center gap-1.5"
              aria-label={t.app.languageToggle}
            >
              <Globe className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              {language === "en" ? "हिन्दी" : "EN"}
            </button>
          </div>

          {/* Controls: Station Telemetry, City Selector, Language */}
          <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
            {/* Live Station / Cache Telemetry Dot */}
            <div
              role="status"
              aria-live="polite"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-white/[0.03] border border-white/[0.08]"
            >
              <Radio
                className={`h-3 w-3 ${
                  intelligence?.provenance.isCacheHit
                    ? "text-amber-400"
                    : "text-emerald-400 animate-pulse"
                }`}
                aria-hidden="true"
              />
              <span className="text-neutral-300">
                {intelligence?.provenance.isCacheHit
                  ? t.app.offlineIndicator
                  : t.app.liveIndicator}
              </span>
            </div>

            {/* City Dropdown Selector */}
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] transition-colors rounded-xl px-3 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
              <label htmlFor={citySelectId} className="sr-only">
                {t.app.citySelectorLabel}
              </label>
              <select
                id={citySelectId}
                value={selectedCityId}
                onChange={(e) => handleCityChange(e.target.value)}
                className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer pr-1"
              >
                {CITY_PRESETS.map((city) => (
                  <option
                    key={city.id}
                    value={city.id}
                    className="bg-[#0e1118] text-white"
                  >
                    {language === "hi" ? city.nameHi : city.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Sync / Refresh Button */}
            <button
              type="button"
              onClick={() => fetchIntelligence(activeCity, language)}
              disabled={isLoading}
              className="p-2 rounded-xl text-neutral-400 hover:text-white bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400"
              aria-label={isLoading ? t.app.refreshing : t.app.refreshButton}
              title={t.app.refreshButton}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin text-sky-400" : ""}`}
                aria-hidden="true"
              />
            </button>

            {/* Desktop Language Toggle */}
            <button
              type="button"
              onClick={handleLanguageToggle}
              className="hidden md:flex px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] text-neutral-300 hover:text-white items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400"
              aria-label={t.app.languageToggle}
            >
              <Globe className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              {t.app.languageToggle}
            </button>
          </div>
        </div>

        {/* Quick City Presets Strip */}
        <div className="border-t border-white/[0.04] bg-white/[0.01] py-2 px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs">
            <span className="text-neutral-400 font-mono text-[11px] uppercase tracking-wider select-none flex-shrink-0">
              {t.app.quickPresets}:
            </span>
            <div className="flex items-center gap-1.5">
              {CITY_PRESETS.map((city) => {
                const isActive = city.id === selectedCityId;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleCityChange(city.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-white/[0.1] text-white border border-white/[0.2] font-semibold"
                        : "bg-white/[0.02] text-neutral-400 border border-white/[0.04] hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    {language === "hi" ? city.nameHi : city.nameEn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        id="main-content"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 w-full"
      >
        {/* Error State Banner */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 flex items-center gap-3 shadow-lg"
          >
            <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
            <div className="text-xs font-mono">
              <strong className="font-bold">Sync Notice: </strong>
              {error}. Using deterministic local atmospheric physics fallback.
            </div>
          </div>
        )}

        {/* Clinical & Household Health Briefing Dispatch */}
        {advisor && (
          <section
            aria-labelledby="family-briefing-heading"
            className="p-6 md:p-7 rounded-2xl bg-[#0d1017] border border-white/[0.08] shadow-2xl relative overflow-hidden space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                  <Stethoscope className="h-4 w-4" aria-hidden="true" />
                </div>
                <h2
                  id="family-briefing-heading"
                  className="text-base md:text-lg font-bold text-white tracking-tight"
                >
                  Clinical & Household Health Briefing
                </h2>
              </div>
              <span className="text-[11px] font-mono px-3 py-0.5 rounded-full bg-white/[0.04] text-neutral-400 border border-white/[0.08] self-start sm:self-auto">
                {advisor.isFallback
                  ? "Deterministic Verified Guidance"
                  : "Gemini 2.5 Guarded Guidance"}
              </span>
            </div>

            <p className="text-sm md:text-base text-neutral-300 leading-relaxed font-normal">
              {advisor.output.familyBriefing}
            </p>

            {/* Protective Action Badges */}
            <div className="pt-1 flex flex-wrap gap-2 text-xs">
              {advisor.output.topActionIds.map((actionId, aIdx) => (
                <span
                  key={aIdx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-neutral-200 font-mono text-xs shadow-sm"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  {actionId.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Loading Indicator Overlay */}
        {isLoading && !intelligence && (
          <div
            role="status"
            aria-live="polite"
            className="p-16 text-center text-neutral-400 space-y-3"
          >
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-sky-400" />
            <p className="text-sm font-medium font-mono">{t.app.refreshing}</p>
          </div>
        )}

        {/* 1. Dual-Scale Reality Check & Station Skew Banner */}
        {intelligence && (
          <DualScaleCard
            cpcb={intelligence.currentConditions.cpcb}
            usEpa={intelligence.currentConditions.usEpa}
            satisfactoryIllusionAlert={
              intelligence.currentConditions.satisfactoryIllusionAlert
            }
            scaleExplanation={intelligence.currentConditions.scaleComparisonExplanation}
            groundStation={intelligence.groundStation}
            pm25Concentration={intelligence.currentConditions.pm25}
            humidityPct={intelligence.diurnalAnalysis.observations48h[0]?.humidityPct}
            wasHumidityAdjusted={
              intelligence.diurnalAnalysis.cleanestToday?.wasHumidityAdjusted
            }
            language={language}
          />
        )}

        {/* 2. 48-Hour Diurnal Clean-Air Window Optimizer */}
        {intelligence && (
          <DiurnalPlanner
            observations48h={intelligence.diurnalAnalysis.observations48h}
            cleanestToday={intelligence.diurnalAnalysis.cleanestToday}
            worstToday={intelligence.diurnalAnalysis.worstToday}
            cleanestTomorrow={intelligence.diurnalAnalysis.cleanestTomorrow}
            worstTomorrow={intelligence.diurnalAnalysis.worstTomorrow}
            selectedArchetype={selectedArchetype}
            onArchetypeChange={handleArchetypeChange}
            language={language}
          />
        )}

        {/* 3. Indoor Shelter & Combustion Audit */}
        {intelligence && (
          <IndoorShelterCard
            outdoorPm25={intelligence.currentConditions.pm25}
            initialRoomDimensions={roomDimensions}
            onRoomDimensionsChange={handleRoomDimensionsChange}
            language={language}
          />
        )}

        {/* 4. Upwind Satellite Smoke & Meteorology Card */}
        {intelligence && (
          <UpwindContextCard
            upwindContext={intelligence.upwindFireContext}
            language={language}
          />
        )}

        {/* 5. Community & RWA Smog Action Hub */}
        {intelligence && (
          <CommunityHub
            cpcbAqi={intelligence.currentConditions.cpcb.aqi}
            outdoorPm25={intelligence.currentConditions.pm25}
            rwaNoticeHeadline={advisor?.output.rwaNoticeHeadline}
            rwaNoticeBody={advisor?.output.rwaNoticeBody}
            language={language}
          />
        )}
      </main>

      {/* Semantic Footer with Attributions and Disclaimers */}
      <AttributionFooter language={language} />
    </div>
  );
}
