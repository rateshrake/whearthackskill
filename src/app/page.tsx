"use client";

import React, { useId } from "react";
import { DICTIONARY } from "@/i18n/dictionary";
import {
  AttributionFooter,
  CommunityHub,
  DashboardHeader,
  DiurnalPlanner,
  DualScaleCard,
  ErrorBoundary,
  HealthBriefingCard,
  IndoorShelterCard,
  UpwindContextCard,
} from "@/components";
import { useVayuShieldPreferences } from "@/hooks/useVayuShieldPreferences";
import { useAirIntelligence } from "@/hooks/useAirIntelligence";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function VayuShieldHome() {
  const citySelectId = useId();

  const {
    selectedCityId,
    activeCity,
    language,
    selectedArchetype,
    roomDimensions,
    handleLanguageToggle,
    handleCityChange,
    handleArchetypeChange,
    handleRoomDimensionsChange,
  } = useVayuShieldPreferences();

  const { intelligence, advisor, advisorArchetype, isLoading, error, fetchIntelligence } =
    useAirIntelligence(activeCity, language, selectedArchetype);

  const t = DICTIONARY[language];

  return (
    <div className="min-h-screen bg-[#08090d] text-neutral-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white atmospheric-bg">
      {/* Skip Navigation Link for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-sky-500 focus:text-black focus:font-bold focus:rounded-md focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white"
      >
        {t.app.skipToMain}
      </a>

      {/* High-Precision Instrument Header */}
      <DashboardHeader
        language={language}
        selectedCityId={selectedCityId}
        citySelectId={citySelectId}
        isLoading={isLoading}
        intelligence={intelligence}
        onLanguageToggle={handleLanguageToggle}
        onCityChange={handleCityChange}
        onRefresh={() => {
          void fetchIntelligence(activeCity, language);
        }}
      />

      {/* Main Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 w-full focus:outline-none"
      >
        {/* Error State Banner */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 flex items-center gap-3 shadow-lg"
          >
            <AlertTriangle
              className="h-5 w-5 text-rose-400 flex-shrink-0"
              aria-hidden="true"
            />
            <div className="text-xs font-mono">
              <strong className="font-bold">{t.app.syncNoticePrefix} </strong>
              {error}. {t.app.syncFallbackSuffix}
            </div>
          </div>
        )}

        {/* Clinical & Household Health Briefing Dispatch */}
        {advisor && (
          <HealthBriefingCard
            advisor={advisor}
            selectedArchetype={selectedArchetype}
            advisorArchetype={advisorArchetype}
            language={language}
          />
        )}

        {/* Loading Indicator Overlay */}
        {isLoading && !intelligence && (
          <div
            role="status"
            aria-live="polite"
            className="p-16 text-center text-neutral-400 space-y-3"
          >
            <RefreshCw
              className="h-8 w-8 animate-spin motion-reduce:animate-none mx-auto text-sky-400"
              aria-hidden="true"
            />
            <p className="text-sm font-medium font-mono">{t.app.refreshing}</p>
          </div>
        )}

        {/* 1. Dual-Scale Reality Check & Station Skew Banner */}
        {intelligence && (
          <ErrorBoundary
            language={language}
            fallbackTitle={t.errorBoundary.dualScaleTitle}
          >
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
          </ErrorBoundary>
        )}

        {/* 2. 48-Hour Diurnal Clean-Air Window Optimizer */}
        {intelligence && (
          <ErrorBoundary language={language} fallbackTitle={t.errorBoundary.diurnalTitle}>
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
          </ErrorBoundary>
        )}

        {/* 3. Indoor Shelter & Combustion Audit */}
        {intelligence && (
          <ErrorBoundary language={language} fallbackTitle={t.errorBoundary.indoorTitle}>
            <IndoorShelterCard
              outdoorPm25={intelligence.currentConditions.pm25}
              initialRoomDimensions={roomDimensions}
              onRoomDimensionsChange={handleRoomDimensionsChange}
              language={language}
            />
          </ErrorBoundary>
        )}

        {/* 4. Upwind Satellite Smoke & Meteorology Card */}
        {intelligence && (
          <ErrorBoundary language={language} fallbackTitle={t.errorBoundary.upwindTitle}>
            <UpwindContextCard
              upwindContext={intelligence.upwindFireContext}
              language={language}
            />
          </ErrorBoundary>
        )}

        {/* 5. Community & RWA Smog Action Hub */}
        {intelligence && (
          <ErrorBoundary
            language={language}
            fallbackTitle={t.errorBoundary.communityTitle}
          >
            <CommunityHub
              cpcbAqi={intelligence.currentConditions.cpcb.aqi}
              outdoorPm25={intelligence.currentConditions.pm25}
              rwaNoticeHeadline={advisor?.output.rwaNoticeHeadline}
              rwaNoticeBody={advisor?.output.rwaNoticeBody}
              language={language}
            />
          </ErrorBoundary>
        )}
      </main>

      {/* Semantic Footer with Attributions and Disclaimers */}
      <AttributionFooter language={language} />
    </div>
  );
}
