"use client";

import React from "react";
import type { CpcbAqiResult, UsEpaAqiResult } from "@/engine";
import type { GroundStationCheck } from "@/services";
import { DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import { Info, Droplets, Activity, Gauge, Radio } from "lucide-react";

export interface DualScaleCardProps {
  cpcb: CpcbAqiResult;
  usEpa: UsEpaAqiResult;
  satisfactoryIllusionAlert: boolean;
  scaleExplanation: string;
  groundStation: GroundStationCheck | null;
  pm25Concentration: number;
  humidityPct?: number | undefined;
  wasHumidityAdjusted?: boolean | undefined;
  language: SupportedLanguage;
}

function formatScaleComparisonNote(
  template: string,
  pm25: number,
  cpcb: CpcbAqiResult,
  usEpa: UsEpaAqiResult,
  cpcbCategoryLabel: string,
  epaCategoryLabel: string,
  language: SupportedLanguage,
): string {
  const dominantSuffix =
    cpcb.criticalPollutant !== "PM2.5"
      ? language === "hi"
        ? `, प्रमुख प्रदूषक ${cpcb.criticalPollutant}`
        : `, driven by ${cpcb.criticalPollutant}`
      : "";

  return template
    .replace("{pm25}", pm25.toFixed(1))
    .replace("{cpcbCategory}", cpcbCategoryLabel)
    .replace("{cpcbAqi}", String(cpcb.aqi))
    .replace("{dominantSuffix}", dominantSuffix)
    .replace("{epaCategory}", epaCategoryLabel)
    .replace("{epaAqi}", String(usEpa.aqi));
}

export function DualScaleCard({
  cpcb,
  usEpa,
  satisfactoryIllusionAlert,
  scaleExplanation,
  groundStation,
  pm25Concentration,
  humidityPct,
  wasHumidityAdjusted,
  language,
}: DualScaleCardProps) {
  const t = DICTIONARY[language].dualScale;
  const localizedCpcbCategory = t.cpcbCategoryLabels[cpcb.category] ?? cpcb.category;
  const localizedEpaCategory = t.epaCategoryLabels[usEpa.category] ?? usEpa.category;
  const safePm25 = Number.isFinite(pm25Concentration)
    ? Math.max(0, pm25Concentration)
    : 0;
  const hasValidHumidity =
    typeof humidityPct === "number" && Number.isFinite(humidityPct);
  const showScaleNote =
    satisfactoryIllusionAlert ||
    usEpa.aqi > cpcb.aqi ||
    scaleExplanation.trim().length > 0;

  const noteTemplate =
    cpcb.aqi <= 50 && usEpa.aqi <= 50
      ? t.scaleNoteGoodBodyTemplate
      : t.scaleNoteBodyTemplate;

  const calmScaleMessage = formatScaleComparisonNote(
    noteTemplate,
    safePm25,
    cpcb,
    usEpa,
    localizedCpcbCategory,
    localizedEpaCategory,
    language,
  );

  return (
    <section
      aria-labelledby="dual-scale-heading"
      className="rounded-2xl border border-white/15 bg-[#0d1017] p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6"
    >
      {/* Subtle top edge specular highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
              {t.eyebrow}
            </span>
          </div>
          <h2
            id="dual-scale-heading"
            className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5"
          >
            <Gauge className="h-6 w-6 text-sky-400" aria-hidden="true" />
            {t.title}
          </h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            {t.description}
          </p>
        </div>

        {/* Ambient Humidity / Optical Sensor Callout */}
        {hasValidHumidity && (
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 bg-white/[0.03] border border-white/20 px-3.5 py-1.5 rounded-xl self-start md:self-auto">
            <Droplets className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <span>
              {t.humidityLabel}: <strong>{humidityPct.toFixed(0)}%</strong>
            </span>
            {wasHumidityAdjusted && (
              <span
                className="text-[10px] text-sky-200 font-semibold bg-sky-950/80 border border-sky-500/40 px-1.5 py-0.5 rounded"
                title={t.rhAdjustedTitle}
              >
                {t.rhAdjustedLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Peaceful, Flat Informational Scale-Comparison Notice (Requirement R3) */}
      {showScaleNote && (
        <aside
          aria-labelledby="scale-comparison-note-heading"
          className="p-4 md:p-5 rounded-xl bg-slate-900/70 border border-slate-700/70 text-slate-200 flex items-start gap-3.5 flat-surface"
        >
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-300 flex-shrink-0 mt-0.5">
            <Info className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1 flex-1">
            <h3
              id="scale-comparison-note-heading"
              className="font-semibold text-slate-100 text-sm md:text-base tracking-tight"
            >
              {t.scaleNoteTitle}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              {calmScaleMessage}
            </p>
          </div>
        </aside>
      )}

      {/* Side-by-Side Dual Scale Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CPCB Scale Card */}
        <div className="p-6 rounded-xl bg-white/[0.02] border border-white/15 hover:border-white/25 transition-colors space-y-4 relative">
          <div className="flex justify-between items-start gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                {t.cpcbHeader}
              </span>
              <div className="text-5xl md:text-6xl font-mono font-light tracking-tight text-white">
                {cpcb.aqi}
              </div>
            </div>
            <span
              className={`text-xs px-3.5 py-1.5 rounded-full font-bold border shadow-sm ${cpcb.colorBlindSafeToken.bgClass} ${cpcb.colorBlindSafeToken.textClass} ${cpcb.colorBlindSafeToken.borderClass}`}
              aria-label={`${t.cpcbCategoryPrefix}: ${localizedCpcbCategory}`}
            >
              {localizedCpcbCategory}
            </span>
          </div>

          <div className="space-y-2 text-xs text-neutral-400 border-t border-white/[0.08] pt-3">
            <div className="flex justify-between font-mono">
              <span className="text-neutral-400">{t.cpcbCategoryPrefix}:</span>
              <strong className="text-white font-semibold">
                {localizedCpcbCategory}
              </strong>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-neutral-400">{t.pm25InputLabel}</span>
              <span className="text-neutral-200">{safePm25.toFixed(1)} µg/m³</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-neutral-400">{t.dominantPollutantLabel}</span>
              <span className="text-sky-300 font-bold uppercase">
                {cpcb.criticalPollutant}
              </span>
            </div>
            {cpcb.isUncappedRawSeverity && (
              <div className="text-[11px] text-rose-200 font-mono font-semibold bg-rose-950/60 p-2 rounded-lg border border-rose-800/60">
                <span aria-hidden="true">⚠️ </span>
                {t.rawSevereSpikeBadge}
              </div>
            )}
          </div>
        </div>

        {/* US EPA 2024 Revised Scale Card */}
        <div className="p-6 rounded-xl bg-white/[0.02] border border-white/15 hover:border-white/25 transition-colors space-y-4 relative">
          <div className="flex justify-between items-start gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                {t.epaHeader}
              </span>
              <div className="text-5xl md:text-6xl font-mono font-light tracking-tight text-white">
                {usEpa.aqi}
              </div>
            </div>
            <span
              className={`text-xs px-3.5 py-1.5 rounded-full font-bold border shadow-sm ${usEpa.colorBlindSafeToken.bgClass} ${usEpa.colorBlindSafeToken.textClass} ${usEpa.colorBlindSafeToken.borderClass}`}
              aria-label={`${t.epaCategoryPrefix}: ${localizedEpaCategory}`}
            >
              {localizedEpaCategory}
            </span>
          </div>

          <div className="space-y-2 text-xs text-neutral-400 border-t border-white/[0.08] pt-3">
            <div className="flex justify-between font-mono">
              <span className="text-neutral-400">{t.epaCategoryPrefix}:</span>
              <strong className="text-white font-semibold">{localizedEpaCategory}</strong>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-neutral-400">{t.revisedStandardLabel}</span>
              <span className="text-emerald-300 font-semibold font-mono">
                {t.revisedStandardValue}
              </span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-neutral-400">{t.healthImplicationLabel}</span>
              <span className="text-neutral-200">
                {usEpa.aqi > 150
                  ? t.healthAdverseAll
                  : usEpa.aqi > 100
                    ? t.healthSensitiveHazard
                    : t.healthAcceptable}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ground Station Skew Check Banner */}
      {groundStation && (
        <div className="p-4 md:p-5 rounded-xl bg-white/[0.02] border border-white/15 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-sky-400" aria-hidden="true" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
                {t.stationSkewTitle}
              </h3>
            </div>
            <span
              className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                groundStation.classification === "micro_hotspot"
                  ? "bg-rose-950/80 text-rose-200 border-rose-700/80"
                  : groundStation.classification === "background_buffer"
                    ? "bg-emerald-950/80 text-emerald-200 border-emerald-700/80"
                    : "bg-neutral-800 text-neutral-200 border-neutral-600"
              }`}
            >
              {groundStation.classification === "micro_hotspot"
                ? t.microHotspotBadge
                : groundStation.classification === "background_buffer"
                  ? t.greenBufferBadge
                  : t.consistentStationBadge}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
            <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/10">
              <span className="text-neutral-400 block text-[10px] uppercase">
                {t.stationLabel}
              </span>
              <strong
                className="text-neutral-200 truncate block mt-0.5"
                title={groundStation.stationName}
              >
                {groundStation.stationName}
              </strong>
            </div>
            <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/10">
              <span className="text-neutral-400 block text-[10px] uppercase">
                {t.stationAqiLabel}
              </span>
              <strong className="text-white text-base block mt-0.5">
                {groundStation.stationAqi}
              </strong>
            </div>
            <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/10">
              <span className="text-neutral-400 block text-[10px] uppercase">
                {t.stationPm25Label}
              </span>
              <strong className="text-neutral-200 block mt-0.5">
                {groundStation.stationPm25.toFixed(1)} µg/m³
              </strong>
            </div>
            <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/10">
              <span className="text-neutral-400 block text-[10px] uppercase">
                {t.modelSkewLabel}
              </span>
              <strong
                className={`block mt-0.5 ${
                  groundStation.stationVsCitySkewPct > 0
                    ? "text-rose-400"
                    : "text-emerald-400"
                }`}
              >
                {groundStation.stationVsCitySkewPct > 0 ? "+" : ""}
                {groundStation.stationVsCitySkewPct.toFixed(1)}%
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Six-Pollutant Sub-Index Breakdown Grid */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
          {t.subIndicesTitle}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {Object.entries(cpcb.subIndices).map(([pollutant, subResult]) => {
            if (!subResult) return null;
            const val = Number.isFinite(subResult.subIndex)
              ? Math.min(500, Math.max(0, subResult.subIndex))
              : 0;
            const barToneClass =
              val > 300
                ? "aqi-bar-rose"
                : val > 200
                  ? "aqi-bar-orange"
                  : val > 100
                    ? "aqi-bar-amber"
                    : "aqi-bar-emerald";

            return (
              <div
                key={pollutant}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/15 text-center space-y-1.5"
              >
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                  {pollutant}
                </span>
                <div className="text-lg font-mono font-semibold text-white">{val}</div>
                <progress
                  max={500}
                  value={val}
                  aria-label={t.subIndexAriaLabel
                    .replace("{pollutant}", pollutant)
                    .replace("{value}", String(val))}
                  className={`aqi-subindex-bar ${barToneClass}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
