"use client";

import React, { useState, useId } from "react";
import {
  mapAqiToGrapStage,
  calculateCommuteDeltas,
  COMMUTE_MODE_PROFILES,
  type CommuteMode,
} from "@/engine";
import { DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import {
  Users,
  Shield,
  Car,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  PhoneCall,
  Leaf,
  Activity,
} from "lucide-react";

export interface CommunityHubProps {
  cpcbAqi: number;
  outdoorPm25: number;
  rwaNoticeHeadline?: string | undefined;
  rwaNoticeBody?: string | undefined;
  language: SupportedLanguage;
}

export function CommunityHub({
  cpcbAqi,
  outdoorPm25,
  rwaNoticeHeadline,
  rwaNoticeBody,
  language,
}: CommunityHubProps) {
  const t = DICTIONARY[language].community;

  // GRAP stage from CPCB AQI
  const grapStage = mapAqiToGrapStage(cpcbAqi);

  // Commute Simulator State
  const [commuteDistanceKm, setCommuteDistanceKm] = useState<number>(20);
  const [chosenMode, setChosenMode] = useState<CommuteMode>("metro_transit");
  const [baselineMode, setBaselineMode] = useState<CommuteMode>("private_petrol_car");

  // Clipboard Copied State
  const [copied, setCopied] = useState<boolean>(false);

  const distanceId = useId();
  const chosenModeId = useId();
  const baselineModeId = useId();

  // Compute live commute deltas
  const commuteDelta = calculateCommuteDeltas(
    commuteDistanceKm,
    outdoorPm25,
    chosenMode,
    baselineMode,
  );

  // Default advisory text if advisor notice is not supplied
  const advisoryHeadline =
    rwaNoticeHeadline ??
    `[RWA / School Emergency Clean-Air Advisory] CAQM ${grapStage.stageName.toUpperCase()} ENFORCED`;

  const advisoryBody =
    rwaNoticeBody ??
    `Dear Residents and School Administrators,\n\n` +
      `CPCB AQI has reached ${cpcbAqi} (${grapStage.severityLabel}). Under statutory CAQM mandates:\n` +
      `1. All outdoor sports, morning assemblies, and physical activities are suspended.\n` +
      `2. Security guards must be provided electric room heaters to strictly prohibit biomass/wood open burning.\n` +
      `3. Use of diesel generator sets (DG sets) is restricted except for essential emergency services.\n` +
      `4. Vulnerable individuals (asthmatic children, elders) must remain in closed rooms with HEPA filtration.\n\n` +
      `Report open burning or dust violations on the 311 Citizen App or CAQM hotline 011-23701213.\n\n` +
      `- Issued via VayuShield Urban Environmental Intelligence`;

  const fullAdvisoryText = `📢 *${advisoryHeadline}*\n\n${advisoryBody}`;

  const handleCopyAdvisory = async () => {
    try {
      await navigator.clipboard.writeText(fullAdvisoryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullAdvisoryText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent("https://vayushield.local")}&text=${encodeURIComponent(fullAdvisoryText)}`;

  return (
    <section
      aria-labelledby="community-hub-heading"
      className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-xl space-y-6"
    >
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2
              id="community-hub-heading"
              className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2"
            >
              <Users className="h-6 w-6 text-indigo-400" aria-hidden="true" />
              {t.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{t.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              style={{ borderColor: grapStage.colorHex }}
              className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-slate-950 text-white border shadow-sm flex items-center gap-2"
            >
              <Shield
                className="h-3.5 w-3.5"
                style={{ color: grapStage.colorHex }}
                aria-hidden="true"
              />
              {grapStage.stageName} (AQI {grapStage.cpcbAqiRange})
            </span>
          </div>
        </div>
      </div>

      {/* Statutory GRAP Checklists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Citizen Protection Checklist */}
        <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-white tracking-wide flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            {t.citizenMandateTitle}
          </h3>
          <ul className="space-y-2.5 text-xs">
            {grapStage.citizenChecklist.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/70"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                <div className="space-y-0.5">
                  <div className="text-slate-200 font-semibold">{item.action}</div>
                  <div className="text-slate-400 text-[11px]">{item.rationale}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* RWA & Housing Society Mandate */}
        <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-white tracking-wide flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            {t.rwaMandateTitle}
          </h3>
          <ul className="space-y-2.5 text-xs">
            {grapStage.rwaChecklist.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/70"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" />
                <div className="space-y-0.5">
                  <div className="text-slate-200 font-semibold">{item.action}</div>
                  <div className="text-slate-400 text-[11px]">{item.rationale}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Transit & Commute Savings Simulator */}
      <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Car className="h-5 w-5 text-indigo-400" aria-hidden="true" />
              {t.carpoolSimulatorTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Quantifies personal pulmonary protection and community vehicular
              decarbonization.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 self-start sm:self-auto">
            Microenvironment Dose Physics
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4 text-xs">
            {/* Round trip distance slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1.5">
                <label htmlFor={distanceId} className="font-semibold">
                  {t.commuteDistanceLabel}
                </label>
                <span className="font-mono text-indigo-300 font-bold">
                  {commuteDistanceKm} km
                </span>
              </div>
              <input
                id={distanceId}
                type="range"
                min="2"
                max="80"
                step="2"
                value={commuteDistanceKm}
                onChange={(e) => setCommuteDistanceKm(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Current Mode */}
            <div>
              <label
                htmlFor={baselineModeId}
                className="block text-slate-300 font-semibold mb-1.5"
              >
                {t.baselineModeLabel}
              </label>
              <select
                id={baselineModeId}
                value={baselineMode}
                onChange={(e) => setBaselineMode(e.target.value as CommuteMode)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:ring-2 focus:ring-indigo-500"
              >
                {(Object.keys(COMMUTE_MODE_PROFILES) as CommuteMode[]).map((modeKey) => (
                  <option key={modeKey} value={modeKey}>
                    {COMMUTE_MODE_PROFILES[modeKey].label} (
                    {COMMUTE_MODE_PROFILES[modeKey].co2GramsPerKm} g CO2/km)
                  </option>
                ))}
              </select>
            </div>

            {/* Clean Alternative Mode */}
            <div>
              <label
                htmlFor={chosenModeId}
                className="block text-slate-300 font-semibold mb-1.5"
              >
                {t.chosenModeLabel}
              </label>
              <select
                id={chosenModeId}
                value={chosenMode}
                onChange={(e) => setChosenMode(e.target.value as CommuteMode)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:ring-2 focus:ring-indigo-500"
              >
                {(Object.keys(COMMUTE_MODE_PROFILES) as CommuteMode[]).map((modeKey) => (
                  <option key={modeKey} value={modeKey}>
                    {COMMUTE_MODE_PROFILES[modeKey].label} (
                    {COMMUTE_MODE_PROFILES[modeKey].co2GramsPerKm} g CO2/km)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Box */}
          <div
            role="region"
            aria-live="polite"
            aria-label={t.carpoolSimulatorTitle}
            className="lg:col-span-2 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Carbon Avoided */}
              <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{t.co2AvoidedLabel}</span>
                  <Leaf className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                </div>
                <div className="text-2xl font-mono font-extrabold text-emerald-400">
                  {commuteDelta.delta.co2AvoidedGrams > 1000
                    ? `${(commuteDelta.delta.co2AvoidedGrams / 1000).toFixed(2)} kg`
                    : `${commuteDelta.delta.co2AvoidedGrams} g`}
                </div>
                <div className="text-xs text-emerald-300 font-mono">
                  {commuteDelta.delta.co2ReductionPct}% emissions reduction
                </div>
              </div>

              {/* Personal Toxic Inhalation Avoided */}
              <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{t.pm25AvoidedLabel}</span>
                  <Activity className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                </div>
                <div className="text-2xl font-mono font-extrabold text-indigo-300">
                  {commuteDelta.delta.pm25InhaledAvoidedUg} µg
                </div>
                <div className="text-xs text-indigo-300 font-mono">
                  {commuteDelta.delta.pm25ReductionPct}% pulmonary dose spared
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
              {commuteDelta.summary}
            </div>
          </div>
        </div>
      </div>

      {/* One-Click RWA / School Official WhatsApp Advisory */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-950 border border-indigo-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Share2 className="h-5 w-5 text-indigo-400" aria-hidden="true" />
              Verified Society Clean-Air Advisory
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ready-to-broadcast WhatsApp notice formatted with certified statutory
              mandates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAdvisory}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-700 hover:bg-indigo-600 text-white shadow-md transition-all active:scale-95 focus:ring-2 focus:ring-indigo-400"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" />
                  {t.copiedSuccess}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t.copyAdvisoryButton}
                </>
              )}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-md transition-all active:scale-95"
            >
              {t.shareWhatsAppButton}
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-700 hover:bg-sky-600 text-white shadow-md transition-all active:scale-95"
            >
              {t.shareTelegramButton}
            </a>
          </div>
        </div>

        {/* Advisory Preview Box */}
        <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
          {fullAdvisoryText}
        </div>
      </div>

      {/* Illegal Open Burning Citizen Hotline */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-amber-900/50 text-xs text-amber-200 flex items-start gap-3">
        <PhoneCall
          className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p className="leading-relaxed font-medium">
          <strong className="text-amber-100">Citizen Air Protection: </strong>
          {t.openBurningHelpline}
        </p>
      </div>
    </section>
  );
}
