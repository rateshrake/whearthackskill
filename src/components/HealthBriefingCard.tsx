"use client";

import React from "react";
import { DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import type { AdvisorExecutionResult } from "@/services/geminiAdvisor";
import type { HouseholdArchetype } from "@/engine";
import { ShieldCheck, Stethoscope } from "lucide-react";

export interface HealthBriefingCardProps {
  advisor: AdvisorExecutionResult;
  selectedArchetype: HouseholdArchetype;
  advisorArchetype: HouseholdArchetype;
  language: SupportedLanguage;
}

export function HealthBriefingCard({
  advisor,
  selectedArchetype,
  advisorArchetype,
  language,
}: HealthBriefingCardProps) {
  const t = DICTIONARY[language].app;
  const archetypeLabels = DICTIONARY[language].diurnal.archetypeLabels;
  const activeArchetypeLabel = archetypeLabels[selectedArchetype];
  const briefingArchetypeLabel = archetypeLabels[advisorArchetype];
  const hasSwitchedArchetype = selectedArchetype !== advisorArchetype;

  return (
    <section
      aria-labelledby="family-briefing-heading"
      className="p-6 md:p-7 rounded-2xl bg-[#0d1017] border border-white/15 shadow-2xl relative overflow-hidden space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
            <Stethoscope className="h-4 w-4" aria-hidden="true" />
          </div>
          <h2
            id="family-briefing-heading"
            className="text-base md:text-lg font-bold text-white tracking-tight"
          >
            {t.briefingHeading}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span
            role="status"
            aria-live="polite"
            className="text-[11px] font-mono px-3 py-0.5 rounded-full bg-sky-950/60 text-sky-200 border border-sky-500/40"
          >
            {t.briefingArchetypeNote}: {activeArchetypeLabel}
            {hasSwitchedArchetype ? ` (${briefingArchetypeLabel})` : ""}
          </span>
          <span className="text-[11px] font-mono px-3 py-0.5 rounded-full bg-white/[0.04] text-neutral-300 border border-white/20">
            {advisor.isFallback ? t.briefingDeterministicBadge : t.briefingGeminiBadge}
          </span>
        </div>
      </div>

      <p className="text-sm md:text-base text-neutral-300 leading-relaxed font-normal">
        {advisor.output.familyBriefing}
      </p>

      {/* Protective Action Badges */}
      <ul className="pt-1 flex flex-wrap gap-2 text-xs">
        {advisor.output.topActionIds.map((actionId, aIdx) => (
          <li
            key={`${actionId}-${aIdx}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/15 text-neutral-200 font-mono text-xs shadow-sm"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
            {t.actionLabels[actionId] ?? actionId.replace(/_/g, " ")}
          </li>
        ))}
      </ul>
    </section>
  );
}
