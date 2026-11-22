"use client";

import React from "react";
import type { UpwindFireContext } from "@/services";
import { DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import {
  Flame,
  Wind,
  Compass,
  AlertTriangle,
  ShieldCheck,
  Satellite,
} from "lucide-react";

export interface UpwindContextCardProps {
  upwindContext: UpwindFireContext;
  language: SupportedLanguage;
}

/**
 * Converts meteorological degrees (0-360) to 16-point compass cardinal string.
 */
function degToCardinal(deg: number): string {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index] ?? "N";
}

export function UpwindContextCard({ upwindContext, language }: UpwindContextCardProps) {
  const t = DICTIONARY[language].upwind;
  const cardinal = degToCardinal(upwindContext.windDirectionDeg);

  const getAlignmentDetails = () => {
    switch (upwindContext.alignment) {
      case "upwind_aligned":
        return {
          title: "Upwind Plume Aligned",
          badgeClass: "bg-amber-950/80 text-amber-300 border-amber-500/80",
          icon: AlertTriangle,
          iconColor: "text-amber-400",
          explanation: t.alignmentUpwindAligned,
        };
      case "crosswind":
        return {
          title: "Crosswind / Lateral Dispersion",
          badgeClass: "bg-sky-950/80 text-sky-300 border-sky-500/80",
          icon: Wind,
          iconColor: "text-sky-400",
          explanation: t.alignmentCrosswind,
        };
      case "none_detected":
      default:
        return {
          title: "No Direct Upwind Plume",
          badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/80",
          icon: ShieldCheck,
          iconColor: "text-emerald-400",
          explanation: t.alignmentNoneDetected,
        };
    }
  };

  const alignmentInfo = getAlignmentDetails();
  const AlignmentIcon = alignmentInfo.icon;

  return (
    <section
      aria-labelledby="upwind-context-heading"
      className="rounded-2xl border border-white/[0.08] bg-[#0d1017] p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6"
    >
      {/* Subtle top edge specular highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
              Remote Sensing & Boundary Trajectory
            </span>
          </div>
          <h2
            id="upwind-context-heading"
            className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5"
          >
            <Flame className="h-6 w-6 text-amber-400" aria-hidden="true" />
            {t.title}
          </h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            {t.description}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 bg-white/[0.03] border border-white/[0.08] px-3.5 py-1.5 rounded-xl self-start md:self-auto">
          <Satellite className="h-4 w-4 text-sky-400" aria-hidden="true" />
          <span>NASA FIRMS VIIRS S-NPP</span>
        </div>
      </div>

      {/* Plume Alignment Classification Banner */}
      <div className="p-4 md:p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/[0.04] ${alignmentInfo.iconColor}`}>
            <AlignmentIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
              {t.windVectorLabel}
            </div>
            <strong className="text-white text-base md:text-lg block mt-0.5">
              {alignmentInfo.title}
            </strong>
          </div>
        </div>

        <span
          className={`text-xs font-mono font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${alignmentInfo.badgeClass}`}
        >
          {alignmentInfo.title}
        </span>
      </div>

      {/* Satellite Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        {/* Fire Count */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-[10px] uppercase">
            <span>{t.satelliteFireCountLabel}</span>
            <Flame className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <div className="text-3xl font-light tracking-tight text-white">
            {upwindContext.fireHotspotCount}
          </div>
          <span className="text-[10px] text-neutral-400 block">
            Within ±1.5° regional bounding box
          </span>
        </div>

        {/* Nearest Fire Proximity */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-[10px] uppercase">
            <span>{t.nearestFireDistanceLabel}</span>
            <Compass className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <div className="text-3xl font-light tracking-tight text-white">
            {upwindContext.nearestFireKm !== null
              ? `${upwindContext.nearestFireKm.toFixed(1)} km`
              : "None"}
          </div>
          <span className="text-[10px] text-neutral-400 block">
            Geodesic proximity to coordinates
          </span>
        </div>

        {/* Wind Vector */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-[10px] uppercase">
            <span>{t.windVectorLabel}</span>
            <Wind className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="text-3xl font-light tracking-tight text-white">
            {upwindContext.windSpeedKmh.toFixed(1)} km/h
          </div>
          <span className="text-[10px] text-neutral-400 block">
            Direction: {upwindContext.windDirectionDeg.toFixed(0)}° ({cardinal})
          </span>
        </div>
      </div>

      {/* Dispersion Outlook Region */}
      <div
        role="region"
        aria-label={t.dispersionOutlookTitle}
        className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs"
      >
        <span className="font-mono text-neutral-400 uppercase tracking-wider text-[10px] font-bold block">
          {t.dispersionOutlookTitle}
        </span>
        <p className="text-neutral-300 leading-relaxed font-normal">
          {alignmentInfo.explanation}
        </p>
        <div className="text-[11px] text-neutral-400 font-mono pt-2 border-t border-white/[0.04]">
          {upwindContext.scientificDisclaimer}
        </div>
      </div>
    </section>
  );
}
