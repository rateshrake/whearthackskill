"use client";

import React from "react";
import type { CpcbAqiResult, UsEpaAqiResult } from "@/engine";
import type { GroundStationCheck } from "@/services";
import { DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import { AlertTriangle, Info, TrendingUp, Droplets, CheckCircle2 } from "lucide-react";

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
      className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl space-y-6"
    >
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-4">
        <h2
          id="dual-scale-heading"
          className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2"
        >
          {t.title}
        </h2>
        <p className="text-sm text-slate-400 mt-1">{t.description}</p>
      </div>

      {/* Critical Satisfactory Illusion Alert Banner */}
      {satisfactoryIllusionAlert && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-5 rounded-xl bg-orange-950/80 border-2 border-orange-500/80 text-orange-100 flex items-start gap-3.5 shadow-lg shadow-orange-950/50"
        >
          <AlertTriangle className="h-6 w-6 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-orange-50 text-base tracking-wide flex items-center gap-2">
              {t.satisfactoryIllusionTitle}
            </h3>
            <p className="text-sm text-orange-200/90 leading-relaxed font-normal">
              {t.satisfactoryIllusionBody}
            </p>
            <div className="text-xs text-orange-300 font-mono mt-1 pt-1 border-t border-orange-800/60">
              {scaleExplanation}
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Dual Scale Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CPCB Scale */}
        <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t.cpcbHeader}
              </span>
              <div className="text-3xl md:text-4xl font-mono font-extrabold text-white mt-1">
                {cpcb.aqi}
              </div>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold border shadow-sm ${cpcb.colorBlindSafeToken.bgClass} ${cpcb.colorBlindSafeToken.textClass} ${cpcb.colorBlindSafeToken.borderClass}`}
              aria-label={`${t.cpcbCategoryPrefix}: ${cpcb.category}`}
            >
              {cpcb.category}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between font-mono">
              <span>{t.cpcbCategoryPrefix}:</span>
              <strong className="text-slate-200 font-semibold">{cpcb.category}</strong>
            </div>
            <div className="flex justify-between font-mono">
              <span>PM2.5 Input:</span>
              <span className="text-slate-300">{pm25Concentration.toFixed(1)} µg/m³</span>
            </div>
            {cpcb.isCapped && (
              <div className="text-amber-400 font-mono font-medium pt-1">
                {t.rawVsCapped} {cpcb.rawAqi})
              </div>
            )}
          </div>
        </div>

        {/* US EPA 2024 Revised Scale */}
        <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t.epaHeader}
              </span>
              <div className="text-3xl md:text-4xl font-mono font-extrabold text-white mt-1">
                {usEpa.aqi}
              </div>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold border shadow-sm ${usEpa.colorBlindSafeToken.bgClass} ${usEpa.colorBlindSafeToken.textClass} ${usEpa.colorBlindSafeToken.borderClass}`}
              aria-label={`${t.epaCategoryPrefix}: ${usEpa.category}`}
            >
              {usEpa.category}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between font-mono">
              <span>{t.epaCategoryPrefix}:</span>
              <strong className="text-slate-200 font-semibold">{usEpa.category}</strong>
            </div>
            <div className="flex justify-between font-mono">
              <span>2024 Good Standard:</span>
              <span className="text-emerald-400 font-semibold">&le; 9.0 µg/m³</span>
            </div>
            {usEpa.isCapped && (
              <div className="text-amber-400 font-mono font-medium pt-1">
                {t.rawVsCapped} {usEpa.rawAqi})
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Six-Pollutant Sub-Index Grid */}
      <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
          {t.subIndicesTitle}
        </h3>
        <p className="text-xs text-slate-400">{t.subIndicesDescription}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
          {(["PM2.5", "PM10", "NO2", "O3", "SO2", "CO"] as const).map((pollutant) => {
            const sub = cpcb.subIndices[pollutant];
            const isCritical = cpcb.criticalPollutant === pollutant;
            return (
              <div
                key={pollutant}
                className={`p-3 rounded-lg border text-center transition ${
                  isCritical
                    ? "bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-950/50"
                    : "bg-slate-900 border-slate-800"
                }`}
              >
                <div className="text-xs font-bold text-slate-300 flex items-center justify-center gap-1">
                  {pollutant}
                  {isCritical && (
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" title="Critical Pollutant" />
                  )}
                </div>
                <div className="text-lg font-mono font-extrabold text-white mt-0.5">
                  {sub?.subIndex ?? "—"}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {sub ? `${sub.concentration} ${pollutant === "CO" ? "mg" : "µg"}` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Station Skew & Optical Humidity Notes */}
      <div className="space-y-3">
        {groundStation && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
              groundStation.classification === "micro_hotspot"
                ? "bg-rose-950/40 border-rose-800/60 text-rose-200"
                : groundStation.classification === "background_buffer"
                  ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                  : "bg-slate-950 border-slate-800 text-slate-300"
            }`}
          >
            {groundStation.classification === "micro_hotspot" ? (
              <TrendingUp className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            ) : groundStation.classification === "background_buffer" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>{groundStation.stationName}</span>
                <span className="font-mono text-[11px] opacity-80">
                  ({groundStation.stationVsCitySkewPct > 0 ? "+" : ""}
                  {groundStation.stationVsCitySkewPct}% vs city model)
                </span>
              </div>
              <p className="mt-1">
                {groundStation.classification === "micro_hotspot"
                  ? t.microHotspotAlert
                  : groundStation.classification === "background_buffer"
                    ? t.greenBufferAlert
                    : t.consistentStationAlert}
              </p>
            </div>
          </div>
        )}

        {wasHumidityAdjusted && (
          <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/60 text-sky-200 flex items-center gap-2.5 text-xs">
            <Droplets className="h-4 w-4 text-sky-400 flex-shrink-0" />
            <span>
              {t.opticalRhAlert} ({humidityPct}% RH)
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
