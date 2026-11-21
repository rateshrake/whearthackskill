"use client";

import React, { useState } from "react";
import {
  calculateRespiratoryDose,
  HOUSEHOLD_ARCHETYPES,
  type DiurnalObservation,
  type ExposureWindow,
  type HouseholdArchetype,
  correctOpticalHygroscopicGrowth,
} from "@/engine";
import { DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import {
  Clock,
  Activity,
  Wind,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  TrendingDown,
  Info,
} from "lucide-react";

export interface DiurnalPlannerProps {
  observations48h: DiurnalObservation[];
  cleanestToday: ExposureWindow | null;
  worstToday: ExposureWindow | null;
  cleanestTomorrow: ExposureWindow | null;
  worstTomorrow: ExposureWindow | null;
  selectedArchetype: HouseholdArchetype;
  onArchetypeChange: (archetype: HouseholdArchetype) => void;
  language: SupportedLanguage;
}

export function DiurnalPlanner({
  observations48h,
  cleanestToday,
  worstToday,
  cleanestTomorrow,
  worstTomorrow,
  selectedArchetype,
  onArchetypeChange,
  language,
}: DiurnalPlannerProps) {
  const t = DICTIONARY[language].diurnal;
  const [selectedObsIndex, setSelectedObsIndex] = useState<number | null>(null);

  // Compute live respiratory dose comparing worst vs cleanest window for today
  const doseComparison =
    worstToday && cleanestToday
      ? calculateRespiratoryDose(worstToday, cleanestToday, selectedArchetype, 120)
      : null;

  // Maximum PM2.5 for timeline scaling
  const maxPm25 = Math.max(
    ...observations48h.map((o) => o.pm25),
    worstToday?.averagePm25 ?? 100,
    100,
  );

  const formatWindowTime = (isoString?: string) => {
    if (!isoString) return "--:--";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return isoString.slice(11, 16);
    }
  };

  const isWithinWindow = (timeIso: string, window: ExposureWindow | null) => {
    if (!window) return false;
    const t = new Date(timeIso).getTime();
    const start = new Date(window.startTimeIso).getTime();
    const end = new Date(window.endTimeIso).getTime();
    return t >= start && t <= end;
  };

  return (
    <section
      aria-labelledby="diurnal-planner-heading"
      className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl space-y-6"
    >
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2
              id="diurnal-planner-heading"
              className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2"
            >
              <Clock className="h-6 w-6 text-teal-400" aria-hidden="true" />
              {t.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{t.description}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-950/80 text-teal-300 border border-teal-800/60 self-start md:self-auto">
            <Sparkles className="h-3.5 w-3.5 text-teal-400" aria-hidden="true" />
            Convective Mixing Forecast
          </span>
        </div>
      </div>

      {/* Best & Worst Window Extremes Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cleanest Today */}
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold uppercase tracking-wider">
            <span>{t.cleanestToday}</span>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="text-lg font-mono font-bold text-white">
            {cleanestToday
              ? `${formatWindowTime(cleanestToday.startTimeIso)} - ${formatWindowTime(cleanestToday.endTimeIso)}`
              : "N/A"}
          </div>
          <div className="text-xs text-emerald-300 font-mono">
            {cleanestToday ? `${cleanestToday.averagePm25.toFixed(1)} µg/m³ PM2.5` : "--"}
          </div>
        </div>

        {/* Worst Today */}
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-rose-400 font-semibold uppercase tracking-wider">
            <span>{t.worstToday}</span>
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="text-lg font-mono font-bold text-white">
            {worstToday
              ? `${formatWindowTime(worstToday.startTimeIso)} - ${formatWindowTime(worstToday.endTimeIso)}`
              : "N/A"}
          </div>
          <div className="text-xs text-rose-300 font-mono">
            {worstToday ? `${worstToday.averagePm25.toFixed(1)} µg/m³ PM2.5` : "--"}
          </div>
        </div>

        {/* Cleanest Tomorrow */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-teal-400 font-semibold uppercase tracking-wider">
            <span>{t.cleanestTomorrow}</span>
            <ShieldCheck className="h-4 w-4 text-teal-400" aria-hidden="true" />
          </div>
          <div className="text-lg font-mono font-bold text-white">
            {cleanestTomorrow
              ? `${formatWindowTime(cleanestTomorrow.startTimeIso)} - ${formatWindowTime(cleanestTomorrow.endTimeIso)}`
              : "N/A"}
          </div>
          <div className="text-xs text-teal-300 font-mono">
            {cleanestTomorrow
              ? `${cleanestTomorrow.averagePm25.toFixed(1)} µg/m³ PM2.5`
              : "--"}
          </div>
        </div>

        {/* Worst Tomorrow */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold uppercase tracking-wider">
            <span>{t.worstTomorrow}</span>
            <AlertCircle className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <div className="text-lg font-mono font-bold text-white">
            {worstTomorrow
              ? `${formatWindowTime(worstTomorrow.startTimeIso)} - ${formatWindowTime(worstTomorrow.endTimeIso)}`
              : "N/A"}
          </div>
          <div className="text-xs text-amber-300 font-mono">
            {worstTomorrow ? `${worstTomorrow.averagePm25.toFixed(1)} µg/m³ PM2.5` : "--"}
          </div>
        </div>
      </div>

      {/* Interactive 48-Hour Hourly Timeline */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="font-semibold text-slate-300">
            48-Hour Particulate Diurnal Cycle (PM2.5 Timeline)
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" />
              Clean Window
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-500 inline-block" />
              Inversion Peak
            </span>
          </div>
        </div>

        {/* Accessible Chart Container */}
        <div
          role="region"
          aria-label={t.interactiveTimelineAria}
          className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl overflow-x-auto focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <div className="min-w-[680px] h-44 flex items-end gap-1.5 pt-6 pb-2 px-1">
            {observations48h.map((obs, idx) => {
              const isClean =
                isWithinWindow(obs.timestampIso, cleanestToday) ||
                isWithinWindow(obs.timestampIso, cleanestTomorrow);
              const isWorst =
                isWithinWindow(obs.timestampIso, worstToday) ||
                isWithinWindow(obs.timestampIso, worstTomorrow);

              const heightPct = Math.max(8, Math.min(100, (obs.pm25 / maxPm25) * 100));
              const timeLabel = formatWindowTime(obs.timestampIso);

              let barBg = "bg-slate-700 hover:bg-slate-600";
              let statusText = "Moderate ambient";

              if (isClean) {
                barBg = "bg-emerald-500 hover:bg-emerald-400";
                statusText = t.recommendedWindowTag;
              } else if (isWorst) {
                barBg = "bg-rose-500 hover:bg-rose-400";
                statusText = t.avoidWindowTag;
              }

              const isSelected = selectedObsIndex === idx;

              return (
                <div
                  key={`${obs.timestampIso}-${idx}`}
                  className="flex-1 flex flex-col items-center h-full justify-end relative"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedObsIndex(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" && idx < observations48h.length - 1) {
                        e.preventDefault();
                        setSelectedObsIndex(idx + 1);
                      } else if (e.key === "ArrowLeft" && idx > 0) {
                        e.preventDefault();
                        setSelectedObsIndex(idx - 1);
                      }
                    }}
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-sm transition-all duration-150 ${barBg} ${
                      isSelected
                        ? "ring-2 ring-white ring-offset-1 ring-offset-slate-900"
                        : "focus:ring-2 focus:ring-teal-400"
                    }`}
                    aria-label={t.hourBarAria
                      .replace("{time}", timeLabel)
                      .replace("{pm25}", obs.pm25.toFixed(1))
                      .replace("{cleanStatus}", statusText)}
                  />
                  {/* Hour tick marks every 4 hours */}
                  {idx % 4 === 0 && (
                    <span
                      aria-hidden="true"
                      className="text-[10px] font-mono text-slate-300 mt-2 block select-none"
                    >
                      {timeLabel.slice(0, 2)}h
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Hour Detail Inspection Banner */}
        {selectedObsIndex !== null && observations48h[selectedObsIndex] && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-teal-400">
                {formatWindowTime(observations48h[selectedObsIndex].timestampIso)}:
              </span>
              <span className="text-slate-300">
                PM2.5:{" "}
                <strong className="text-white font-mono">
                  {observations48h[selectedObsIndex].pm25.toFixed(1)} µg/m³
                </strong>
              </span>
              <span className="text-slate-400 font-mono">
                PM10: {observations48h[selectedObsIndex].pm10.toFixed(1)} µg/m³
              </span>
              {observations48h[selectedObsIndex].humidityPct !== undefined && (
                <span className="text-slate-400 font-mono">
                  RH: {observations48h[selectedObsIndex].humidityPct}%
                </span>
              )}
            </div>
            {observations48h[selectedObsIndex].humidityPct !== undefined &&
              observations48h[selectedObsIndex].humidityPct! > 75 && (
                <span className="text-amber-400 font-medium">
                  {
                    correctOpticalHygroscopicGrowth(
                      observations48h[selectedObsIndex].pm25,
                      observations48h[selectedObsIndex].humidityPct,
                    ).wasAdjusted
                      ? "Hygroscopic growth adjusted"
                      : "Unadjusted"
                  }
                </span>
              )}
          </div>
        )}
      </div>

      {/* Household Archetype Selection & Inhaled Dose Comparison */}
      <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 space-y-6">
        <div>
          <label
            htmlFor="archetype-selector"
            className="block text-sm font-semibold text-slate-200 mb-2"
          >
            {t.archetypeSelectorLabel}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(
              Object.keys(HOUSEHOLD_ARCHETYPES) as HouseholdArchetype[]
            ).map((archKey) => {
              const arch = HOUSEHOLD_ARCHETYPES[archKey];
              const isSelected = selectedArchetype === archKey;
              return (
                <button
                  key={archKey}
                  type="button"
                  id={`archetype-btn-${archKey}`}
                  onClick={() => onArchetypeChange(archKey)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-teal-950/60 border-teal-500 shadow-md shadow-teal-950/40 text-white"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-bold text-sm">{arch.label}</span>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-teal-300">
                      {arch.minuteVentilationLpm} L/min
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {arch.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pulmonary Dose Calculation Live Box */}
        {doseComparison && (
          <div
            role="region"
            aria-live="polite"
            aria-label={t.doseComparisonTitle}
            className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-400" aria-hidden="true" />
                  {t.doseComparisonTitle}
                </h3>
                <p className="text-xs text-slate-400">{t.doseComparisonSubtitle}</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-600/80 rounded-full text-emerald-300 text-xs font-mono font-bold self-start sm:self-auto">
                <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                {t.reductionPercentageLabel} -{doseComparison.percentReduction}%
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                <span className="text-xs text-slate-400 block">{t.baselineDoseLabel}</span>
                <span className="text-lg md:text-xl font-mono font-extrabold text-rose-300 mt-0.5 block">
                  {doseComparison.baselineDoseUg} µg
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({doseComparison.baselineWindow.averagePm25.toFixed(1)} µg/m³)
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                <span className="text-xs text-slate-400 block">{t.shiftedDoseLabel}</span>
                <span className="text-lg md:text-xl font-mono font-extrabold text-emerald-300 mt-0.5 block">
                  {doseComparison.shiftedDoseUg} µg
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({doseComparison.shiftedWindow.averagePm25.toFixed(1)} µg/m³)
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                <span className="text-xs text-slate-400 block">{t.netSparedLabel}</span>
                <span className="text-lg md:text-xl font-mono font-extrabold text-teal-300 mt-0.5 block">
                  {doseComparison.reductionUg} µg
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">
                  Spared from lungs
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                <span className="text-xs text-slate-400 block">
                  {t.airVolumeInhaledLabel}
                </span>
                <span className="text-lg md:text-xl font-mono font-extrabold text-slate-200 mt-0.5 block">
                  {doseComparison.inhaledAirVolumeM3} m³
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({doseComparison.inhaledAirVolumeM3 * 1000} Liters)
                </span>
              </div>
            </div>

            <div className="text-xs text-teal-200/90 font-medium bg-teal-950/40 border border-teal-800/50 p-3 rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 text-teal-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{doseComparison.clinicalSignificance}</span>
            </div>
          </div>
        )}
      </div>

      {/* Nocturnal Inversion Science Note */}
      <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/70 text-xs text-slate-400 flex items-start gap-3">
        <Wind className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">{t.nocturnalInversionNote}</p>
      </div>
    </section>
  );
}
