"use client";

import React, { useState } from "react";
import {
  calculateRespiratoryDose,
  HOUSEHOLD_ARCHETYPES,
  type DiurnalObservation,
  type ExposureWindow,
  type HouseholdArchetype,
} from "@/engine";
import { DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import { Clock, ShieldCheck, AlertCircle, TrendingDown, Sun, Moon } from "lucide-react";

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
    const time = new Date(timeIso).getTime();
    const start = new Date(window.startTimeIso).getTime();
    const end = new Date(window.endTimeIso).getTime();
    return time >= start && time <= end;
  };

  return (
    <section
      aria-labelledby="diurnal-planner-heading"
      className="rounded-2xl border border-white/[0.08] bg-[#0d1017] p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6"
    >
      {/* Subtle top edge specular highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2 w-2 rounded-full bg-sky-400" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
              Planetary Boundary Layer Dynamics
            </span>
          </div>
          <h2
            id="diurnal-planner-heading"
            className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5"
          >
            <Clock className="h-6 w-6 text-sky-400" aria-hidden="true" />
            {t.title}
          </h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            {t.description}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 rounded-xl self-start md:self-auto">
          <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <span>Convective Mixing Peak: 13:00–16:00</span>
        </div>
      </div>

      {/* Diurnal Extremes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cleanest Today */}
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-mono font-bold uppercase tracking-wider">
            <span>{t.cleanestToday}</span>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="text-xl font-mono font-semibold text-white">
            {cleanestToday
              ? `${formatWindowTime(cleanestToday.startTimeIso)} – ${formatWindowTime(cleanestToday.endTimeIso)}`
              : "N/A"}
          </div>
          <div className="text-xs text-emerald-300 font-mono">
            {cleanestToday ? `${cleanestToday.averagePm25.toFixed(1)} µg/m³ avg` : "--"}
          </div>
        </div>

        {/* Worst Peak Today */}
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-rose-400 font-mono font-bold uppercase tracking-wider">
            <span>{t.worstToday}</span>
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="text-xl font-mono font-semibold text-white">
            {worstToday
              ? `${formatWindowTime(worstToday.startTimeIso)} – ${formatWindowTime(worstToday.endTimeIso)}`
              : "N/A"}
          </div>
          <div className="text-xs text-rose-300 font-mono">
            {worstToday ? `${worstToday.averagePm25.toFixed(1)} µg/m³ peak` : "--"}
          </div>
        </div>

        {/* Cleanest Tomorrow */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono font-bold uppercase tracking-wider">
            <span>{t.cleanestTomorrow}</span>
            <Sun className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <div className="text-xl font-mono font-semibold text-neutral-200">
            {cleanestTomorrow
              ? `${formatWindowTime(cleanestTomorrow.startTimeIso)} – ${formatWindowTime(cleanestTomorrow.endTimeIso)}`
              : "N/A"}
          </div>
          <div className="text-xs text-neutral-400 font-mono">
            {cleanestTomorrow
              ? `${cleanestTomorrow.averagePm25.toFixed(1)} µg/m³ avg`
              : "--"}
          </div>
        </div>

        {/* Worst Peak Tomorrow */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono font-bold uppercase tracking-wider">
            <span>{t.worstTomorrow}</span>
            <Moon className="h-4 w-4 text-purple-400" aria-hidden="true" />
          </div>
          <div className="text-xl font-mono font-semibold text-neutral-200">
            {worstTomorrow
              ? `${formatWindowTime(worstTomorrow.startTimeIso)} – ${formatWindowTime(worstTomorrow.endTimeIso)}`
              : "N/A"}
          </div>
          <div className="text-xs text-neutral-400 font-mono">
            {worstTomorrow ? `${worstTomorrow.averagePm25.toFixed(1)} µg/m³ peak` : "--"}
          </div>
        </div>
      </div>

      {/* Interactive 48-Hour Particulate Timeline */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
            48-Hour Hourly Particulate Timeline
          </h3>
          <span className="text-[11px] font-mono text-neutral-400">
            Interactive Continuous Scrubber
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3 overflow-x-auto">
          {/* Bar Chart Visualization */}
          <div className="min-w-[700px] h-32 flex items-end gap-1.5 pt-4">
            {observations48h.map((obs, idx) => {
              const heightPct = Math.min(100, Math.max(10, (obs.pm25 / maxPm25) * 100));
              const isClean = isWithinWindow(obs.timestampIso, cleanestToday);
              const isWorst = isWithinWindow(obs.timestampIso, worstToday);
              const isSelected = selectedObsIndex === idx;

              let barColor = "bg-neutral-700 hover:bg-neutral-600";
              if (isClean) barColor = "bg-emerald-500 hover:bg-emerald-400";
              else if (isWorst) barColor = "bg-rose-500 hover:bg-rose-400";
              else if (obs.pm25 > 250) barColor = "bg-rose-600/80 hover:bg-rose-500";
              else if (obs.pm25 > 120) barColor = "bg-amber-500/80 hover:bg-amber-400";

              const hour = new Date(obs.timestampIso).getHours();

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedObsIndex(idx)}
                  className="flex-1 flex flex-col items-center justify-end h-full group focus:outline-none"
                  aria-label={`Hour ${hour}:00, PM2.5 ${obs.pm25.toFixed(0)} µg/m³`}
                >
                  <div
                    className={`w-full rounded-t transition-all ${barColor} ${
                      isSelected ? "ring-2 ring-white scale-105" : ""
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </button>
              );
            })}
          </div>

          {/* Hour Ticks Row (Outside Buttons) */}
          <div className="min-w-[700px] flex gap-1.5 text-[9px] font-mono text-neutral-400 select-none pt-1 border-t border-white/[0.04]">
            {observations48h.map((obs, idx) => {
              const hour = new Date(obs.timestampIso).getHours();
              return (
                <div key={idx} className="flex-1 text-center">
                  {hour % 6 === 0 ? `${hour}h` : ""}
                </div>
              );
            })}
          </div>

          {/* Active Hover / Selected Telemetry Readout */}
          {selectedObsIndex !== null && observations48h[selectedObsIndex] && (
            <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-300">
                Time:{" "}
                <strong>
                  {new Date(
                    observations48h[selectedObsIndex]!.timestampIso,
                  ).toLocaleString()}
                </strong>
              </span>
              <span className="text-white">
                PM2.5:{" "}
                <strong>
                  {observations48h[selectedObsIndex]!.pm25.toFixed(1)} µg/m³
                </strong>
              </span>
              <span className="text-neutral-300">
                Humidity:{" "}
                <strong>
                  {observations48h[selectedObsIndex]!.humidityPct?.toFixed(0) ?? "--"}%
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Household Archetype Selector & Respiratory Dose Comparison */}
      <div className="space-y-4 border-t border-white/[0.06] pt-6">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold mb-2">
            {t.archetypeSelectorLabel}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {(Object.keys(HOUSEHOLD_ARCHETYPES) as HouseholdArchetype[]).map(
              (archKey) => {
                const arch = HOUSEHOLD_ARCHETYPES[archKey];
                const isSelected = selectedArchetype === archKey;
                return (
                  <button
                    key={archKey}
                    id={`archetype-btn-${archKey}`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onArchetypeChange(archKey)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      isSelected
                        ? "bg-white/[0.08] border-sky-400 text-white shadow-md"
                        : "bg-white/[0.02] border-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">{arch.label}</div>
                    <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                      {arch.minuteVentilationLpm} L/min ventilation
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* Pulmonary Inhaled Dose Comparison Section */}
        {doseComparison && (
          <div
            role="region"
            aria-live="polite"
            aria-label={t.doseComparisonTitle}
            className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <h4 className="font-bold text-sm text-white">{t.doseComparisonTitle}</h4>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                {HOUSEHOLD_ARCHETYPES[selectedArchetype].label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20">
                <span className="text-[10px] uppercase text-rose-300 block">
                  {t.baselineDoseLabel}
                </span>
                <div className="text-xl font-bold text-white mt-1">
                  {doseComparison.baselineDoseUg.toFixed(1)} µg
                </div>
                <span className="text-[10px] text-neutral-400">
                  2-hour morning exposure
                </span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                <span className="text-[10px] uppercase text-emerald-300 block">
                  {t.shiftedDoseLabel}
                </span>
                <div className="text-xl font-bold text-white mt-1">
                  {doseComparison.shiftedDoseUg.toFixed(1)} µg
                </div>
                <span className="text-[10px] text-neutral-400">
                  2-hour afternoon window
                </span>
              </div>

              <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-500/20">
                <span className="text-[10px] uppercase text-sky-300 block">
                  {t.netSparedLabel}
                </span>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  -{doseComparison.percentReduction.toFixed(1)}%
                </div>
                <span className="text-[10px] text-neutral-400">
                  {doseComparison.reductionUg.toFixed(1)} µg toxic particulate spared
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
