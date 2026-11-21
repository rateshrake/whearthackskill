"use client";

import React, { useState, useId } from "react";
import {
  calculateRoomVolume,
  modelSteadyStateIndoorPm25,
  calculateRequiredCadr,
  estimateCombustionSpike,
  COMBUSTION_EVENT_PROFILES,
  type CombustionEventType,
  type RoomDimensions,
} from "@/engine";
import { DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import { Home, Flame, ShieldCheck, AlertTriangle, Info, Layers } from "lucide-react";

export interface IndoorShelterCardProps {
  outdoorPm25: number;
  initialRoomDimensions?: RoomDimensions | undefined;
  onRoomDimensionsChange?: ((dims: RoomDimensions) => void) | undefined;
  language: SupportedLanguage;
}

export function IndoorShelterCard({
  outdoorPm25,
  initialRoomDimensions = { lengthMeters: 5.0, widthMeters: 4.0, heightMeters: 2.8 },
  onRoomDimensionsChange,
  language,
}: IndoorShelterCardProps) {
  const t = DICTIONARY[language].indoor;

  const [lengthMeters, setLengthMeters] = useState<number>(
    initialRoomDimensions.lengthMeters,
  );
  const [widthMeters, setWidthMeters] = useState<number>(
    initialRoomDimensions.widthMeters,
  );
  const [heightMeters, setHeightMeters] = useState<number>(
    initialRoomDimensions.heightMeters,
  );
  const [selectedCombustion, setSelectedCombustion] =
    useState<CombustionEventType>("mosquito_coil");

  // IDs for accessibility labels
  const lengthId = useId();
  const widthId = useId();
  const heightId = useId();
  const combustionId = useId();

  const dimensions: RoomDimensions = { lengthMeters, widthMeters, heightMeters };
  const roomVolumeM3 = calculateRoomVolume(dimensions);

  const handleDimensionChange = (field: keyof RoomDimensions, val: number) => {
    const updated = { ...dimensions, [field]: val };
    if (field === "lengthMeters") setLengthMeters(val);
    if (field === "widthMeters") setWidthMeters(val);
    if (field === "heightMeters") setHeightMeters(val);
    onRoomDimensionsChange?.(updated);
  };

  // Steady-state indoor modeling for the 3 regimes
  const openWindowsState = modelSteadyStateIndoorPm25(
    outdoorPm25,
    dimensions,
    "open_windows",
  );
  const closedNoFilterState = modelSteadyStateIndoorPm25(
    outdoorPm25,
    dimensions,
    "closed_windows_no_filter",
  );
  const targetCadr = calculateRequiredCadr(outdoorPm25, dimensions);
  const closedHepaState = modelSteadyStateIndoorPm25(
    outdoorPm25,
    dimensions,
    "closed_windows_hepa",
    targetCadr.requiredCadrM3h,
  );

  // Combustion spike estimation
  const baselineForCombustion = closedHepaState.indoorPm25;
  const spikeEstimate = estimateCombustionSpike(
    selectedCombustion,
    dimensions,
    baselineForCombustion,
    targetCadr.requiredCadrM3h,
  );

  return (
    <section
      aria-labelledby="indoor-shelter-heading"
      className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl space-y-6"
    >
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2
              id="indoor-shelter-heading"
              className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2"
            >
              <Home className="h-6 w-6 text-sky-400" aria-hidden="true" />
              {t.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{t.description}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-950/80 text-sky-300 border border-sky-800/60 self-start md:self-auto">
            <Layers className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
            Steady-State Single-Zone Physics
          </span>
        </div>
      </div>

      {/* Room Dimensions & Target CADR Sizing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dimensions Controls */}
        <div className="lg:col-span-1 p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-white tracking-wide flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-400" aria-hidden="true" />
            {t.roomDimensionsTitle}
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label htmlFor={lengthId} className="font-medium">
                  {t.lengthLabel}
                </label>
                <span className="font-mono text-sky-300">
                  {lengthMeters.toFixed(1)} m
                </span>
              </div>
              <input
                id={lengthId}
                type="range"
                min="2.0"
                max="12.0"
                step="0.5"
                value={lengthMeters}
                onChange={(e) =>
                  handleDimensionChange("lengthMeters", parseFloat(e.target.value))
                }
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label htmlFor={widthId} className="font-medium">
                  {t.widthLabel}
                </label>
                <span className="font-mono text-sky-300">{widthMeters.toFixed(1)} m</span>
              </div>
              <input
                id={widthId}
                type="range"
                min="2.0"
                max="10.0"
                step="0.5"
                value={widthMeters}
                onChange={(e) =>
                  handleDimensionChange("widthMeters", parseFloat(e.target.value))
                }
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <label htmlFor={heightId} className="font-medium">
                  {t.heightLabel}
                </label>
                <span className="font-mono text-sky-300">
                  {heightMeters.toFixed(1)} m
                </span>
              </div>
              <input
                id={heightId}
                type="range"
                min="2.2"
                max="4.5"
                step="0.1"
                value={heightMeters}
                onChange={(e) =>
                  handleDimensionChange("heightMeters", parseFloat(e.target.value))
                }
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">{t.volumeLabel}</span>
            <span className="font-mono font-bold text-white text-sm">
              {roomVolumeM3.toFixed(1)} m³
            </span>
          </div>
        </div>

        {/* CADR Sizing Result */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h3 className="font-bold text-sm text-white tracking-wide flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                {t.targetCadrTitle}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Achieves ≤ 21% outdoor infiltration ratio ($C_{`{in}`} / C_{`{out}`} \le
                0.21$)
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Outdoor: {outdoorPm25.toFixed(1)} µg/m³
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
              <span className="text-xs text-slate-400 block">Required CADR (m³/h)</span>
              <span className="text-xl font-mono font-extrabold text-sky-300 mt-0.5 block">
                {targetCadr.requiredCadrM3h} m³/h
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Clean Air Delivery Rate
              </span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
              <span className="text-xs text-slate-400 block">Required CADR (CFM)</span>
              <span className="text-xl font-mono font-extrabold text-teal-300 mt-0.5 block">
                {targetCadr.requiredCadrCfm} CFM
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Cubic Feet per Minute
              </span>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg">
              <span className="text-xs text-slate-400 block">Required Purifier ACH</span>
              <span className="text-xl font-mono font-extrabold text-emerald-300 mt-0.5 block">
                {targetCadr.requiredAchHepa} ACH
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Air Changes per Hour
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-300 bg-sky-950/30 border border-sky-800/40 p-3 rounded-lg flex items-start gap-2">
            <Info
              className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span className="leading-relaxed">
              {targetCadr.isAchievableWithoutFilter
                ? t.targetCadrAchieved
                : t.targetCadrNeeded
                    .replace("{cadr}", targetCadr.requiredCadrM3h.toString())
                    .replace("{cfm}", targetCadr.requiredCadrCfm.toString())
                    .replace("{ach}", targetCadr.requiredAchHepa.toString())}
            </span>
          </div>
        </div>
      </div>

      {/* Comparison Bars: Outdoor vs Closed vs Closed + HEPA */}
      <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 space-y-5">
        <h3 className="font-bold text-sm text-white tracking-wide">
          {t.comparisonBarsTitle}
        </h3>

        <div className="space-y-4">
          {/* 1. Outdoor Baseline */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-300">
                1. {t.outdoorConcentrationLabel}
              </span>
              <span className="font-mono font-bold text-rose-300">
                {outdoorPm25.toFixed(1)} µg/m³ (100%)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full w-full" />
            </div>
          </div>

          {/* 2. Open Windows */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-300">2. {t.openWindowsLabel}</span>
              <span className="font-mono font-bold text-amber-300">
                {openWindowsState.indoorPm25.toFixed(1)} µg/m³ (
                {(openWindowsState.infiltrationRatio * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${Math.min(100, openWindowsState.infiltrationRatio * 100)}%`,
                }}
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
              />
            </div>
          </div>

          {/* 3. Closed Windows Without Filter */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-300">
                3. {t.closedNoFilterLabel}
              </span>
              <span className="font-mono font-bold text-amber-200">
                {closedNoFilterState.indoorPm25.toFixed(1)} µg/m³ (
                {(closedNoFilterState.infiltrationRatio * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${Math.min(100, closedNoFilterState.infiltrationRatio * 100)}%`,
                }}
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
              />
            </div>
          </div>

          {/* 4. Closed Windows + Sized HEPA Purifier */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck
                  className="h-3.5 w-3.5 text-emerald-400"
                  aria-hidden="true"
                />
                4. {t.closedHepaLabel}
              </span>
              <span className="font-mono font-bold text-emerald-300">
                {closedHepaState.indoorPm25.toFixed(1)} µg/m³ (
                {(closedHepaState.infiltrationRatio * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{
                  width: `${Math.min(100, closedHepaState.infiltrationRatio * 100)}%`,
                }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Discrete Indoor Combustion Spike Estimator */}
      <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Flame className="h-5 w-5 text-rose-400" aria-hidden="true" />
              {t.combustionAuditTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{t.combustionAuditSubtitle}</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60 self-start sm:self-auto">
            Discrete Emission Physics
          </span>
        </div>

        {/* Trigger Selection Tabs */}
        <div>
          <label
            htmlFor={combustionId}
            className="block text-xs font-semibold text-slate-300 mb-2"
          >
            {t.triggerSelectLabel}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(COMBUSTION_EVENT_PROFILES) as CombustionEventType[]).map(
              (evtKey) => {
                const profile = COMBUSTION_EVENT_PROFILES[evtKey];
                const isSelected = selectedCombustion === evtKey;
                return (
                  <button
                    key={evtKey}
                    type="button"
                    id={`combustion-btn-${evtKey}`}
                    onClick={() => setSelectedCombustion(evtKey)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-rose-950/50 border-rose-500 text-white shadow-md shadow-rose-950/30"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <Flame
                        className={`h-3.5 w-3.5 ${isSelected ? "text-rose-400" : "text-slate-500"}`}
                      />
                      {profile.label}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-1">
                      +{profile.peakSpikeAddedUgM3} µg/m³ peak spike
                    </div>
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* Spike & Exponential Clearance Breakdown */}
        <div
          role="region"
          aria-live="polite"
          aria-label={t.combustionAuditTitle}
          className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Peak Total Concentration */}
            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 block">{t.acuteSpikeLabel}</span>
              <span className="text-lg md:text-xl font-mono font-extrabold text-rose-400 mt-0.5 block">
                {spikeEstimate.peakTotalIndoorPm25} µg/m³
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                (+{spikeEstimate.peakSpikeConcentrationUgM3} µg/m³ spike)
              </span>
            </div>

            {/* Natural Clearance */}
            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 block">
                {t.clearanceTimeClosed}
              </span>
              <span className="text-lg md:text-xl font-mono font-extrabold text-amber-300 mt-0.5 block">
                {spikeEstimate.recoveryTimesMinutes.closedWindowsNoFilter} min
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Slow natural envelope loss
              </span>
            </div>

            {/* HEPA Clearance */}
            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 block">{t.clearanceTimeHepa}</span>
              <span className="text-lg md:text-xl font-mono font-extrabold text-emerald-400 mt-0.5 block">
                {spikeEstimate.recoveryTimesMinutes.closedWindowsWithHepa} min
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">
                Rapid mechanical removal
              </span>
            </div>

            {/* Window Flush Clearance */}
            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 block">{t.clearanceTimeFlush}</span>
              <span className="text-lg md:text-xl font-mono font-extrabold text-sky-400 mt-0.5 block">
                {spikeEstimate.recoveryTimesMinutes.openWindowsRapidFlush} min
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Cross-ventilation flush
              </span>
            </div>
          </div>

          {/* Chemical Hazards */}
          <div className="space-y-1.5 text-xs">
            <span className="font-semibold text-slate-300 block">
              {t.chemicalHazardsLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {spikeEstimate.event.chemicalHazards.map((hazard, hIdx) => (
                <span
                  key={hIdx}
                  className="px-2.5 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700 font-mono text-[11px]"
                >
                  {hazard}
                </span>
              ))}
            </div>
          </div>

          {/* Protective Protocol & Citation */}
          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
            <div className="text-slate-300 flex items-start gap-2">
              <AlertTriangle
                className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                <strong className="text-amber-200">{t.safetyAdviceLabel}: </strong>
                {spikeEstimate.protectiveAdvice}
              </span>
            </div>
            <div className="text-slate-400 flex items-start gap-2">
              <Info
                className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span className="italic">
                <strong className="not-italic text-slate-300">
                  {t.literatureCitationLabel}:{" "}
                </strong>
                {spikeEstimate.event.literatureCitation}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
