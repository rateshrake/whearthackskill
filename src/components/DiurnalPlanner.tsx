"use client";

import React, { useState, useEffect, useRef } from "react";
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
  const locale = language === "hi" ? "hi-IN" : "en-IN";
  const [selectedObsIndex, setSelectedObsIndex] = useState<number | null>(null);
  const barButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Reset selected hour readout when city / observation series updates
  useEffect(() => {
    setSelectedObsIndex(null);
  }, [observations48h]);

  // Compute live respiratory dose comparing worst vs cleanest window for today
  const doseComparison =
    worstToday && cleanestToday
      ? calculateRespiratoryDose(worstToday, cleanestToday, selectedArchetype, 120)
      : null;

  // Maximum PM2.5 for timeline scaling (filter non-finite values safely)
  const finitePmValues = observations48h
    .map((o) => o.pm25)
    .filter((v) => Number.isFinite(v) && v >= 0);
  const safeWorstAvg =
    worstToday && Number.isFinite(worstToday.averagePm25) ? worstToday.averagePm25 : 100;
  const maxPm25 = Math.max(...finitePmValues, safeWorstAvg, 100);

  const formatWindowTime = (isoString?: string) => {
    if (!isoString) return "--:--";
    try {
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return isoString.slice(11, 16);
      return date.toLocaleTimeString(locale, {
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

  const firstTimestampMs = observations48h[0]
    ? Date.parse(observations48h[0].timestampIso)
    : Number.NaN;

  const handleBarKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    const total = observations48h.length;
    if (total === 0) return;

    let nextIdx: number | null = null;
    if (event.key === "ArrowRight") {
      nextIdx = (idx + 1) % total;
    } else if (event.key === "ArrowLeft") {
      nextIdx = (idx - 1 + total) % total;
    } else if (event.key === "Home") {
      nextIdx = 0;
    } else if (event.key === "End") {
      nextIdx = total - 1;
    }

    if (nextIdx !== null) {
      event.preventDefault();
      setSelectedObsIndex(nextIdx);
      barButtonRefs.current[nextIdx]?.focus();
    }
  };

  const selectedObs =
    selectedObsIndex !== null ? observations48h[selectedObsIndex] : undefined;

  return (
    <section
      aria-labelledby="diurnal-planner-heading"
      className="rounded-2xl border border-white/15 bg-[#0d1017] p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6"
    >
      {/* Subtle top edge specular highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2 w-2 rounded-full bg-sky-400" aria-hidden="true" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
              {t.eyebrow}
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

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 bg-white/[0.03] border border-white/20 px-3.5 py-1.5 rounded-xl self-start md:self-auto">
          <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <span>{t.convectiveMixingBadge}</span>
        </div>
      </div>

      {/* Diurnal Extremes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cleanest Today */}
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/35 space-y-1.5">
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
            {cleanestToday
              ? `${cleanestToday.averagePm25.toFixed(1)} ${t.avgUnit}`
              : "--"}
          </div>
        </div>

        {/* Worst Peak Today */}
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/35 space-y-1.5">
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
            {worstToday ? `${worstToday.averagePm25.toFixed(1)} ${t.peakUnit}` : "--"}
          </div>
        </div>

        {/* Cleanest Tomorrow */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/15 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-300 font-mono font-bold uppercase tracking-wider">
            <span>{t.cleanestTomorrow}</span>
            <Sun className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <div className="text-xl font-mono font-semibold text-neutral-100">
            {cleanestTomorrow
              ? `${formatWindowTime(cleanestTomorrow.startTimeIso)} – ${formatWindowTime(cleanestTomorrow.endTimeIso)}`
              : "N/A"}
          </div>
          <div className="text-xs text-neutral-400 font-mono">
            {cleanestTomorrow
              ? `${cleanestTomorrow.averagePm25.toFixed(1)} ${t.avgUnit}`
              : "--"}
          </div>
        </div>

        {/* Worst Peak Tomorrow */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/15 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-300 font-mono font-bold uppercase tracking-wider">
            <span>{t.worstTomorrow}</span>
            <Moon className="h-4 w-4 text-purple-400" aria-hidden="true" />
          </div>
          <div className="text-xl font-mono font-semibold text-neutral-100">
            {worstTomorrow
              ? `${formatWindowTime(worstTomorrow.startTimeIso)} – ${formatWindowTime(worstTomorrow.endTimeIso)}`
              : "N/A"}
          </div>
          <div className="text-xs text-neutral-400 font-mono">
            {worstTomorrow
              ? `${worstTomorrow.averagePm25.toFixed(1)} ${t.peakUnit}`
              : "--"}
          </div>
        </div>
      </div>

      {/* Interactive 48-Hour Particulate Timeline */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
            {t.timelineTitle}
          </h3>
          <span className="text-[11px] font-mono text-neutral-400">
            {t.timelineSubtitle}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/15 space-y-3 overflow-x-auto">
          {/* Bar Chart Visualization (SVG rects: zero inline styles, >= 24px target width, >= 3:1 contrast) */}
          <div
            role="group"
            aria-label={t.interactiveTimelineAria}
            className="min-w-[1280px] h-32 flex items-end gap-1 pt-4"
          >
            {observations48h.map((obs, idx) => {
              const safePm = Number.isFinite(obs.pm25) ? Math.max(0, obs.pm25) : 0;
              const heightPct = Math.min(100, Math.max(12, (safePm / maxPm25) * 100));
              const isClean = isWithinWindow(obs.timestampIso, cleanestToday);
              const isWorst = isWithinWindow(obs.timestampIso, worstToday);
              const isSelected = selectedObsIndex === idx;

              let barTextClass = "text-neutral-500 hover:text-neutral-300";
              if (isClean) barTextClass = "text-emerald-400 hover:text-emerald-300";
              else if (isWorst) barTextClass = "text-rose-400 hover:text-rose-300";
              else if (safePm > 250) barTextClass = "text-rose-500 hover:text-rose-400";
              else if (safePm > 120) barTextClass = "text-amber-400 hover:text-amber-300";

              const obsMs = Date.parse(obs.timestampIso);
              const dayLabel =
                Number.isFinite(firstTimestampMs) &&
                Number.isFinite(obsMs) &&
                obsMs - firstTimestampMs >= 24 * 60 * 60 * 1000
                  ? t.tomorrowLabel
                  : t.todayLabel;
              const formattedTime = formatWindowTime(obs.timestampIso);
              const statusLabel = isClean
                ? t.recommendedWindowTag
                : isWorst
                  ? t.avoidWindowTag
                  : t.neutralWindowTag;

              const ariaLabel = t.hourBarAria
                .replace("{day}", dayLabel)
                .replace("{time}", formattedTime)
                .replace("{pm25}", safePm.toFixed(0))
                .replace("{cleanStatus}", statusLabel);

              return (
                <button
                  key={`${obs.timestampIso}-${idx}`}
                  ref={(el) => {
                    barButtonRefs.current[idx] = el;
                  }}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedObsIndex(idx)}
                  onKeyDown={(e) => handleBarKeyDown(e, idx)}
                  className={`min-w-[24px] flex-1 flex flex-col items-center justify-end h-full rounded transition-transform motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${barTextClass} ${
                    isSelected
                      ? "ring-2 ring-white scale-105 motion-reduce:scale-100"
                      : ""
                  }`}
                  aria-label={ariaLabel}
                >
                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 24 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="2"
                      y={100 - heightPct}
                      width="20"
                      height={heightPct}
                      rx="2"
                      className="fill-current"
                    />
                  </svg>
                </button>
              );
            })}
          </div>

          {/* Hour Ticks Row (Outside Buttons) */}
          <div className="min-w-[1280px] flex gap-1 text-[9px] font-mono text-neutral-400 select-none pt-1 border-t border-white/[0.08]">
            {observations48h.map((obs, idx) => {
              const hour = new Date(obs.timestampIso).getHours();
              return (
                <div
                  key={`tick-${obs.timestampIso}-${idx}`}
                  className="min-w-[24px] flex-1 text-center"
                >
                  {hour % 6 === 0 ? `${hour}h` : ""}
                </div>
              );
            })}
          </div>

          {/* Active Hover / Selected Telemetry Readout */}
          {selectedObs && (
            <div
              role="status"
              aria-live="polite"
              className="p-3 rounded-lg bg-white/[0.04] border border-white/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
            >
              <span className="text-neutral-300">
                {t.timeLabel}{" "}
                <strong>
                  {new Date(selectedObs.timestampIso).toLocaleString(locale)}
                </strong>
              </span>
              <span className="text-white">
                {t.pm25Label}{" "}
                <strong>
                  {(Number.isFinite(selectedObs.pm25) ? selectedObs.pm25 : 0).toFixed(1)}{" "}
                  µg/m³
                </strong>
              </span>
              <span className="text-neutral-300">
                {t.humidityLabel}{" "}
                <strong>
                  {selectedObs.humidityPct !== undefined &&
                  Number.isFinite(selectedObs.humidityPct)
                    ? selectedObs.humidityPct.toFixed(0)
                    : "--"}
                  %
                </strong>
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          {t.nocturnalInversionNote}
        </p>
      </div>

      {/* Household Archetype Selector & Respiratory Dose Comparison */}
      <div className="space-y-4 border-t border-white/[0.08] pt-6">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold mb-2">
            {t.archetypeSelectorLabel}
          </h3>
          <div
            role="group"
            aria-label={t.archetypeSelectorLabel}
            className="grid grid-cols-2 md:grid-cols-4 gap-2.5"
          >
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
                    className={`p-3 rounded-xl text-left border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      isSelected
                        ? "bg-white/[0.1] border-sky-400 text-white shadow-md"
                        : "bg-white/[0.02] border-white/40 text-neutral-300 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">
                      {t.archetypeLabels[archKey]}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                      {arch.minuteVentilationLpm} {t.ventilationUnit}
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
            className="p-5 rounded-xl bg-white/[0.02] border border-white/15 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <h4 className="font-bold text-sm text-white">{t.doseComparisonTitle}</h4>
              </div>
              <span className="text-xs font-mono text-neutral-300">
                {t.archetypeLabels[selectedArchetype]}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30">
                <span className="text-[10px] uppercase text-rose-300 block">
                  {t.baselineDoseLabel}
                </span>
                <div className="text-xl font-bold text-white mt-1">
                  {doseComparison.baselineDoseUg.toFixed(1)} µg
                </div>
                <span className="text-[10px] text-neutral-400">{t.baselineSubLabel}</span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                <span className="text-[10px] uppercase text-emerald-300 block">
                  {t.shiftedDoseLabel}
                </span>
                <div className="text-xl font-bold text-white mt-1">
                  {doseComparison.shiftedDoseUg.toFixed(1)} µg
                </div>
                <span className="text-[10px] text-neutral-400">{t.shiftedSubLabel}</span>
              </div>

              <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-500/30">
                <span className="text-[10px] uppercase text-sky-300 block">
                  {t.netSparedLabel}
                </span>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  -{doseComparison.percentReduction.toFixed(1)}%
                </div>
                <span className="text-[10px] text-neutral-400">
                  {doseComparison.reductionUg.toFixed(1)} {t.sparedSubLabel}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
