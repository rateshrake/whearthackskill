"use client";

import React from "react";
import type { UpwindFireContext } from "@/services";
import { DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import {
  Flame,
  Wind,
  Compass,
  AlertTriangle,
  Info,
  ShieldCheck,
  Radio,
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
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
  ];
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index] ?? "N";
}

export function UpwindContextCard({
  upwindContext,
  language,
}: UpwindContextCardProps) {
  const t = DICTIONARY[language].upwind;
  const cardinal = degToCardinal(upwindContext.windDirectionDeg);

  const getAlignmentDetails = () => {
    switch (upwindContext.alignment) {
      case "upwind_aligned":
        return {
          title: "Upwind Plume Aligned",
          badgeClass: "bg-orange-950/80 text-orange-300 border-orange-500/80",
          icon: AlertTriangle,
          iconColor: "text-orange-400",
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
      className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl space-y-6"
    >
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2
              id="upwind-context-heading"
              className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2"
            >
              <Flame className="h-6 w-6 text-amber-500" aria-hidden="true" />
              {t.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{t.description}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/60 self-start md:self-auto">
            <Radio className="h-3.5 w-3.5 text-amber-400 animate-pulse" aria-hidden="true" />
            NASA FIRMS (VIIRS SNPP NRT)
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Fires Count */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>{t.satelliteFireCountLabel}</span>
            <Flame className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <div className="text-2xl md:text-3xl font-mono font-extrabold text-white">
            {upwindContext.fireHotspotCount}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Within ±1.5° regional bounding box
          </div>
        </div>

        {/* Nearest Fire Distance */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>{t.nearestFireDistanceLabel}</span>
            <Compass className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <div className="text-2xl md:text-3xl font-mono font-extrabold text-white">
            {upwindContext.nearestFireKm !== null
              ? `${upwindContext.nearestFireKm.toFixed(1)} km`
              : "None Detected"}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Direct geodesic proximity
          </div>
        </div>

        {/* Local Wind Vector */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>{t.windVectorLabel}</span>
            <Wind className="h-4 w-4 text-teal-400" aria-hidden="true" />
          </div>
          <div className="text-2xl md:text-3xl font-mono font-extrabold text-white flex items-center gap-2">
            <span>{upwindContext.windSpeedKmh.toFixed(1)} km/h</span>
            <span className="text-sm font-semibold text-teal-400 font-sans">
              {cardinal} ({Math.round(upwindContext.windDirectionDeg)}°)
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Planetary boundary layer ground vector
          </div>
        </div>
      </div>

      {/* Dispersion Outlook Callout */}
      <div
        role="region"
        aria-live="polite"
        aria-label={t.dispersionOutlookTitle}
        className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <AlignmentIcon className={`h-5 w-5 ${alignmentInfo.iconColor}`} aria-hidden="true" />
            {t.dispersionOutlookTitle}
          </h3>
          <span
            className={`text-xs px-3 py-1 rounded-full font-bold border self-start sm:self-auto ${alignmentInfo.badgeClass}`}
          >
            {alignmentInfo.title}
          </span>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed font-normal">
          {alignmentInfo.explanation}
        </p>
      </div>

      {/* Scientific Causation Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/70 text-xs text-slate-400 flex items-start gap-3">
        <Info className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">
          <strong className="text-slate-300">Methodological Note: </strong>
          {t.scientificDisclaimer}
        </p>
      </div>
    </section>
  );
}
