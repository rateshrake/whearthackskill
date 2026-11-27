"use client";

import React, { useState, useEffect, useId } from "react";
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
import { Home, Flame, Layers, Wind } from "lucide-react";

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

  // Sync local sliders when persisted room dimensions hydrate asynchronously from localStorage
  useEffect(() => {
    setLengthMeters(initialRoomDimensions.lengthMeters);
    setWidthMeters(initialRoomDimensions.widthMeters);
    setHeightMeters(initialRoomDimensions.heightMeters);
  }, [
    initialRoomDimensions.lengthMeters,
    initialRoomDimensions.widthMeters,
    initialRoomDimensions.heightMeters,
  ]);

  // IDs for accessibility labels
  const lengthId = useId();
  const widthId = useId();
  const heightId = useId();

  const dimensions: RoomDimensions = { lengthMeters, widthMeters, heightMeters };
  const roomVolumeM3 = calculateRoomVolume(dimensions);

  const handleDimensionChange = (field: keyof RoomDimensions, val: number) => {
    if (!Number.isFinite(val) || val <= 0) return;
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
      className="rounded-2xl border border-white/[0.08] bg-[#0d1017] p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6"
    >
      {/* Subtle top edge specular highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
              First-Principles Microenvironment Physics
            </span>
          </div>
          <h2
            id="indoor-shelter-heading"
            className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5"
          >
            <Home className="h-6 w-6 text-sky-400" aria-hidden="true" />
            {t.title}
          </h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            {t.description}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 rounded-xl self-start md:self-auto">
          <Layers className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span>
            Room Volume: <strong>{roomVolumeM3.toFixed(1)} m³</strong>
          </span>
        </div>
      </div>

      {/* Room Dimensions Sliders Grid */}
      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
          {t.roomDimensionsTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Length */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <label htmlFor={lengthId} className="text-neutral-400 font-medium">
                {t.lengthLabel}
              </label>
              <span className="text-white font-bold">{lengthMeters.toFixed(1)} m</span>
            </div>
            <input
              id={lengthId}
              type="range"
              min="2.5"
              max="12.0"
              step="0.5"
              value={lengthMeters}
              onChange={(e) =>
                handleDimensionChange("lengthMeters", parseFloat(e.target.value))
              }
              className="w-full"
              aria-label={`${t.lengthLabel}: ${lengthMeters} m`}
            />
          </div>

          {/* Width */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <label htmlFor={widthId} className="text-neutral-400 font-medium">
                {t.widthLabel}
              </label>
              <span className="text-white font-bold">{widthMeters.toFixed(1)} m</span>
            </div>
            <input
              id={widthId}
              type="range"
              min="2.5"
              max="10.0"
              step="0.5"
              value={widthMeters}
              onChange={(e) =>
                handleDimensionChange("widthMeters", parseFloat(e.target.value))
              }
              className="w-full"
              aria-label={`${t.widthLabel}: ${widthMeters} m`}
            />
          </div>

          {/* Height */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <label htmlFor={heightId} className="text-neutral-400 font-medium">
                {t.heightLabel}
              </label>
              <span className="text-white font-bold">{heightMeters.toFixed(1)} m</span>
            </div>
            <input
              id={heightId}
              type="range"
              min="2.4"
              max="4.5"
              step="0.1"
              value={heightMeters}
              onChange={(e) =>
                handleDimensionChange("heightMeters", parseFloat(e.target.value))
              }
              className="w-full"
              aria-label={`${t.heightLabel}: ${heightMeters} m`}
            />
          </div>
        </div>
      </div>

      {/* Steady-State Infiltration Regimes */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
          {t.comparisonBarsTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Regime 1: Open Windows */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300 block">
              {t.openWindowsLabel}
            </span>
            <div className="text-2xl font-mono font-bold text-white">
              {openWindowsState.indoorPm25.toFixed(1)} µg/m³
            </div>
            <div className="text-xs text-neutral-400 font-mono">
              Infiltration:{" "}
              <strong className="text-rose-400">
                {(openWindowsState.infiltrationRatio * 100).toFixed(0)}%
              </strong>
            </div>
          </div>

          {/* Regime 2: Closed Windows, No Purifier */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 block">
              {t.closedNoFilterLabel}
            </span>
            <div className="text-2xl font-mono font-bold text-white">
              {closedNoFilterState.indoorPm25.toFixed(1)} µg/m³
            </div>
            <div className="text-xs text-neutral-400 font-mono">
              Infiltration:{" "}
              <strong className="text-amber-400">
                {(closedNoFilterState.infiltrationRatio * 100).toFixed(0)}%
              </strong>
            </div>
          </div>

          {/* Regime 3: Closed Windows + HEPA Purifier */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300 block">
              {t.closedHepaLabel}
            </span>
            <div className="text-2xl font-mono font-bold text-white">
              {closedHepaState.indoorPm25.toFixed(1)} µg/m³
            </div>
            <div className="text-xs text-neutral-400 font-mono">
              Infiltration:{" "}
              <strong className="text-emerald-400">
                {(closedHepaState.infiltrationRatio * 100).toFixed(0)}%
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* CADR Sizing & Recommendation Banner */}
      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold">
              {t.targetCadrTitle}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            Target Infiltration: ≤ 21%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs pt-1">
          <div className="bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
            <span className="text-neutral-400 block text-[10px] uppercase">
              Clean Air Delivery
            </span>
            <strong className="text-white text-lg block mt-0.5">
              {targetCadr.requiredCadrM3h.toFixed(0)} m³/h
            </strong>
            <span className="text-neutral-400 text-[10px]">Required CADR (m³/h)</span>
          </div>
          <div className="bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
            <span className="text-neutral-400 block text-[10px] uppercase">
              Imperial CADR
            </span>
            <strong className="text-neutral-200 text-lg block mt-0.5">
              {targetCadr.requiredCadrCfm.toFixed(0)} CFM
            </strong>
            <span className="text-neutral-400 text-[10px]">Imperial flow rate</span>
          </div>
          <div className="bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
            <span className="text-neutral-400 block text-[10px] uppercase">
              Air Exchange Rate
            </span>
            <strong className="text-emerald-400 text-lg block mt-0.5">
              {targetCadr.requiredAchHepa.toFixed(1)} ACH
            </strong>
            <span className="text-neutral-400 text-[10px]">Air changes per hour</span>
          </div>
        </div>
      </div>

      {/* Acute Indoor Combustion Spike Audit */}
      <div
        role="region"
        aria-label={t.combustionAuditTitle}
        className="space-y-4 border-t border-white/[0.06] pt-6"
      >
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
            {t.combustionAuditTitle}
          </h3>
        </div>

        {/* Combustion Source Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(Object.keys(COMBUSTION_EVENT_PROFILES) as CombustionEventType[]).map(
            (cKey) => {
              const profile = COMBUSTION_EVENT_PROFILES[cKey];
              const isSelected = selectedCombustion === cKey;
              return (
                <button
                  key={cKey}
                  id={`combustion-btn-${cKey}`}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedCombustion(cKey)}
                  className={`p-3.5 rounded-xl text-left border transition-all ${
                    isSelected
                      ? "bg-amber-950/30 border-amber-500 text-white shadow-md"
                      : "bg-white/[0.02] border-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="font-semibold text-xs text-white">{profile.label}</div>
                  <div className="text-[10px] font-mono text-neutral-400 mt-1">
                    Peak: +{(profile.emissionRateUgPerMin / 1000).toFixed(1)} mg/min
                    emission
                  </div>
                </button>
              );
            },
          )}
        </div>

        {/* Selected Combustion Telemetry Card */}
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
            <strong className="text-white text-sm">
              {COMBUSTION_EVENT_PROFILES[selectedCombustion].label}
            </strong>
            <span className="text-[11px] font-mono text-amber-300">
              Clearance Time to 90%:{" "}
              <strong>
                {spikeEstimate.recoveryTimesMinutes.closedWindowsWithHepa.toFixed(0)} min
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-neutral-400 block">{t.acuteSpikeLabel}</span>
              <strong className="text-rose-400 text-base">
                +{spikeEstimate.peakSpikeConcentrationUgM3.toFixed(1)} µg/m³
              </strong>
            </div>
            <div>
              <span className="text-neutral-400 block">{t.literatureCitationLabel}</span>
              <span className="text-amber-200 text-xs">
                {COMBUSTION_EVENT_PROFILES[selectedCombustion].literatureCitation}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
