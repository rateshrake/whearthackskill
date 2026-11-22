"use client";

import React from "react";
import type { CpcbAqiResult, UsEpaAqiResult } from "@/engine";
import type { GroundStationCheck } from "@/services";
import { DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import { AlertTriangle, Droplets, Activity, Gauge, Radio } from "lucide-react";

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

  return (
    <section
      aria-labelledby="dual-scale-heading"
      className="rounded-2xl border border-white/[0.08] bg-[#0d1017] p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6"
    >
      {/* Subtle top edge specular highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
              Comparative Metrology
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
        {typeof humidityPct === "number" && (
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 rounded-xl self-start md:self-auto">
            <Droplets className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <span>
              Humidity: <strong>{humidityPct.toFixed(0)}%</strong>
            </span>
            {wasHumidityAdjusted && (
              <span
                className="text-[10px] text-amber-300 font-semibold bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded"
                title="Optical sensor hygroscopic swelling correction applied"
              >
                RH Adjusted
              </span>
            )}
          </div>
        )}
      </div>

      {/* Critical Satisfactory Illusion Alert Banner */}
      {satisfactoryIllusionAlert && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-5 md:p-6 rounded-xl bg-[#2a1306] border-2 border-amber-500/80 text-amber-50 flex items-start gap-4 shadow-xl"
        >
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 flex-shrink-0 mt-0.5">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider px-2.5 py-0.5 rounded bg-amber-500 text-black uppercase">
                SATISFACTORY ILLUSION
              </span>
              <h3 className="font-extrabold text-white text-base md:text-lg tracking-wide">
                {t.satisfactoryIllusionTitle}
              </h3>
            </div>
            <p className="text-sm text-amber-200/90 leading-relaxed font-normal">
              {t.satisfactoryIllusionBody}
            </p>
            <div className="text-xs text-amber-300/90 font-mono pt-2 border-t border-amber-800/40">
              {scaleExplanation}
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Dual Scale Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CPCB Scale Card */}
        <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.12] transition-colors space-y-4 relative">
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
              aria-label={`${t.cpcbCategoryPrefix}: ${cpcb.category}`}
            >
              {cpcb.category}
            </span>
          </div>

          <div className="space-y-2 text-xs text-neutral-400 border-t border-white/[0.06] pt-3">
            <div className="flex justify-between font-mono">
              <span className="text-neutral-400">{t.cpcbCategoryPrefix}:</span>
              <strong className="text-white font-semibold">{cpcb.category}</strong>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-neutral-400">PM2.5 Input:</span>
              <span className="text-neutral-200">
                {pm25Concentration.toFixed(1)} µg/m³
              </span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-neutral-400">Dominant Pollutant:</span>
              <span className="text-sky-300 font-bold uppercase">
                {cpcb.criticalPollutant}
              </span>
            </div>
            {cpcb.isUncappedRawSeverity && (
              <div className="text-[11px] text-rose-300 font-mono font-semibold bg-rose-950/60 p-2 rounded-lg border border-rose-800/60">
                ⚠️ Raw severe particulate spike exceeds 500 cap
              </div>
            )}
          </div>
        </div>

        {/* US EPA 2024 Revised Scale Card */}
        <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.12] transition-colors space-y-4 relative">
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
              aria-label={`${t.epaCategoryPrefix}: ${usEpa.category}`}
            >
              {usEpa.category}
            </span>
          </div>

          <div className="space-y-2 text-xs text-neutral-400 border-t border-white/[0.06] pt-3">
            <div className="flex justify-between font-mono">
              <span className="text-neutral-400">{t.epaCategoryPrefix}:</span>
              <strong className="text-white font-semibold">{usEpa.category}</strong>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-neutral-400">Revised Standard:</span>
              <span className="text-emerald-300 font-semibold font-mono">
                9.0 µg/m³ Good Threshold
              </span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-neutral-400">Health Implication:</span>
              <span className="text-neutral-200">
                {usEpa.aqi > 150
                  ? "Adverse for all persons"
                  : usEpa.aqi > 100
                    ? "Respiratory hazard for sensitive"
                    : "Acceptable for healthy adults"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ground Station Skew Check Banner */}
      {groundStation && (
        <div className="p-4 md:p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
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
                  ? "bg-rose-950/80 text-rose-300 border-rose-700/80"
                  : groundStation.classification === "background_buffer"
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/80"
                    : "bg-neutral-800 text-neutral-300 border-neutral-700"
              }`}
            >
              {groundStation.classification === "micro_hotspot"
                ? "MICRO-HOTSPOT DETECTED"
                : groundStation.classification === "background_buffer"
                  ? "URBAN GREEN BUFFER"
                  : "STATION CONSISTENCY"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
            <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
              <span className="text-neutral-400 block text-[10px] uppercase">
                Station
              </span>
              <strong
                className="text-neutral-200 truncate block mt-0.5"
                title={groundStation.stationName}
              >
                {groundStation.stationName}
              </strong>
            </div>
            <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
              <span className="text-neutral-400 block text-[10px] uppercase">
                Station AQI
              </span>
              <strong className="text-white text-base block mt-0.5">
                {groundStation.stationAqi}
              </strong>
            </div>
            <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
              <span className="text-neutral-400 block text-[10px] uppercase">
                Station PM2.5
              </span>
              <strong className="text-neutral-200 block mt-0.5">
                {groundStation.stationPm25.toFixed(1)} µg/m³
              </strong>
            </div>
            <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
              <span className="text-neutral-400 block text-[10px] uppercase">
                Model Skew
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
            const val = subResult.subIndex;
            return (
              <div
                key={pollutant}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center space-y-1"
              >
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
                  {pollutant}
                </span>
                <div className="text-lg font-mono font-semibold text-white">{val}</div>
                <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      val > 300
                        ? "bg-rose-500"
                        : val > 200
                          ? "bg-orange-500"
                          : val > 100
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.min(100, (val / 500) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
