"use client";

import React from "react";
import { CITY_PRESETS, DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import type { AirIntelligencePayload } from "@/services/airQualityAggregator";
import { Activity, Globe, MapPin, Radio, RefreshCw } from "lucide-react";

export interface DashboardHeaderProps {
  language: SupportedLanguage;
  selectedCityId: string;
  citySelectId: string;
  isLoading: boolean;
  intelligence: AirIntelligencePayload | null;
  onLanguageToggle: () => void;
  onCityChange: (cityId: string) => void;
  onRefresh: () => void;
}

export function DashboardHeader({
  language,
  selectedCityId,
  citySelectId,
  isLoading,
  intelligence,
  onLanguageToggle,
  onCityChange,
  onRefresh,
}: DashboardHeaderProps) {
  const t = DICTIONARY[language].app;

  return (
    <header className="border-b border-white/15 bg-[#0c0e14]/90 backdrop-blur-xl sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Wordmark & Subtitle */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/20 text-sky-400">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>{t.title}</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.06] text-neutral-300 border border-white/20">
                  v1.0
                </span>
              </h1>
              <p className="text-[11px] text-neutral-400 font-mono tracking-tight">
                {t.subtitle}
              </p>
            </div>
          </div>

          {/* Language Toggle for Mobile */}
          <button
            type="button"
            onClick={onLanguageToggle}
            className="md:hidden px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-white/[0.04] border border-white/40 hover:border-white/60 text-neutral-200 hover:text-white flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label={t.languageToggle}
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
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-white/[0.03] border border-white/20"
          >
            <Radio
              className={`h-3 w-3 ${
                intelligence?.provenance.isCacheHit
                  ? "text-amber-400"
                  : "text-emerald-400 animate-pulse motion-reduce:animate-none"
              }`}
              aria-hidden="true"
            />
            <span className="text-neutral-300">
              {intelligence?.provenance.isCacheHit ? t.offlineIndicator : t.liveIndicator}
            </span>
          </div>

          {/* City Dropdown Selector */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/40 hover:border-white/60 focus-within:ring-2 focus-within:ring-sky-400 focus-within:border-sky-400 transition-colors rounded-xl px-3 py-1.5">
            <MapPin className="h-3.5 w-3.5 text-neutral-300" aria-hidden="true" />
            <label htmlFor={citySelectId} className="sr-only">
              {t.citySelectorLabel}
            </label>
            <select
              id={citySelectId}
              value={selectedCityId}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer pr-1"
            >
              {CITY_PRESETS.map((city) => (
                <option key={city.id} value={city.id} className="bg-[#0e1118] text-white">
                  {language === "hi" ? city.nameHi : city.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Sync / Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl text-neutral-300 hover:text-white bg-white/[0.03] border border-white/40 hover:border-white/60 disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label={isLoading ? t.refreshing : t.refreshButton}
            title={t.refreshButton}
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isLoading ? "animate-spin motion-reduce:animate-none text-sky-400" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {/* Desktop Language Toggle */}
          <button
            type="button"
            onClick={onLanguageToggle}
            className="hidden md:flex px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium bg-white/[0.03] border border-white/40 hover:border-white/60 text-neutral-200 hover:text-white items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label={t.languageToggle}
          >
            <Globe className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
            {t.languageToggle}
          </button>
        </div>
      </div>

      {/* Quick City Presets Strip */}
      <nav
        aria-label={t.quickPresets}
        className="border-t border-white/10 bg-white/[0.01] py-2 px-4 sm:px-6 lg:px-8 overflow-x-auto"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs">
          <span className="text-neutral-400 font-mono text-[11px] uppercase tracking-wider select-none flex-shrink-0">
            {t.quickPresets}:
          </span>
          <div
            role="group"
            aria-label={t.quickPresets}
            className="flex items-center gap-1.5"
          >
            {CITY_PRESETS.map((city) => {
              const isActive = city.id === selectedCityId;
              return (
                <button
                  key={city.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onCityChange(city.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isActive
                      ? "bg-white/[0.14] text-white border border-sky-400 font-semibold"
                      : "bg-white/[0.02] text-neutral-300 border border-white/40 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {language === "hi" ? city.nameHi : city.nameEn}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}
