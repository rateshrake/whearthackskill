"use client";

import React, { useState, useEffect, useRef, useId } from "react";
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
  AlertTriangle,
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
  const tCommon = DICTIONARY[language].app;
  const safeCpcbAqi = Number.isFinite(cpcbAqi) ? Math.max(0, cpcbAqi) : 0;
  const safeOutdoorPm25 = Number.isFinite(outdoorPm25) ? Math.max(0, outdoorPm25) : 0;

  // GRAP stage from CPCB AQI
  const grapStage = mapAqiToGrapStage(safeCpcbAqi);
  const localizedGrapName = t.grapStageNames[grapStage.stage];
  const localizedSeverity = t.grapSeverityLabels[grapStage.stage];

  // Commute Simulator State
  const [commuteDistanceKm, setCommuteDistanceKm] = useState<number>(20);
  const [chosenMode, setChosenMode] = useState<CommuteMode>("metro_transit");
  const baselineMode: CommuteMode = "private_petrol_car";

  // Clipboard Copied State
  const [copied, setCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<boolean>(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic share URL (client origin or configured NEXT_PUBLIC_APP_URL)
  const [shareUrl, setShareUrl] = useState<string>(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://vayushield.app",
  );

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_APP_URL && typeof window !== "undefined") {
      setShareUrl(window.location.origin);
    }
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const distanceId = useId();

  // Compute live commute deltas
  const commuteDelta = calculateCommuteDeltas(
    commuteDistanceKm,
    safeOutdoorPm25,
    chosenMode,
    baselineMode,
  );

  // Default advisory text if advisor notice is not supplied (bilingual)
  const advisoryHeadline =
    rwaNoticeHeadline ??
    (language === "hi"
      ? `[RWA / स्कूल स्वच्छ-वायु परामर्श] CAQM ${localizedGrapName} लागू`
      : `[RWA / School Emergency Clean-Air Advisory] CAQM ${localizedGrapName.toUpperCase()} ENFORCED`);

  const advisoryBody =
    rwaNoticeBody ??
    (language === "hi"
      ? `निवासियों एवं विद्यालय प्रशासकों के लिए सूचना,\n\n` +
        `CPCB AQI ${safeCpcbAqi} (${localizedSeverity}) पर पहुंच गया है। वैधानिक CAQM निर्देशों के अंतर्गत:\n` +
        `1. सभी बाहरी खेलकूद और प्रातःकालीन सभाएं स्थगित रहेंगी।\n` +
        `2. सुरक्षा गार्डों को इलेक्ट्रिक हीटर उपलब्ध कराएं; कचरा या लकड़ी जलाना पूर्णतः वर्जित है।\n` +
        `3. आपातकालीन सेवाओं को छोड़कर डीजल जनरेटर सेट का उपयोग प्रतिबंधित है।\n` +
        `4. संवेदनशील व्यक्ति (दमा पीड़ित बच्चे, वरिष्ठ नागरिक) HEPA फिल्टर वाले बंद कमरे में रहें।\n\n` +
        `अवैध कचरा जलाने या धूल उल्लंघन की रिपोर्ट 311 ऐप या CAQM हेल्पलाइन 011-23701213 पर करें।\n\n` +
        `- वायुशील्ड शहरी पर्यावरण सूचना द्वारा जारी`
      : `Dear Residents and School Administrators,\n\n` +
        `CPCB AQI has reached ${safeCpcbAqi} (${localizedSeverity}). Under statutory CAQM mandates:\n` +
        `1. All outdoor sports, morning assemblies, and physical activities are suspended.\n` +
        `2. Security guards must be provided electric room heaters to strictly prohibit biomass/wood open burning.\n` +
        `3. Use of diesel generator sets (DG sets) is restricted except for essential emergency services.\n` +
        `4. Vulnerable individuals (asthmatic children, elders) must remain in closed rooms with HEPA filtration.\n\n` +
        `Report open burning or dust violations on the 311 Citizen App or CAQM hotline 011-23701213.\n\n` +
        `- Issued via VayuShield Urban Environmental Intelligence`);

  const fullAdvisoryText = `📢 *${advisoryHeadline}*\n\n${advisoryBody}`;

  const handleCopyAdvisory = async () => {
    try {
      await navigator.clipboard.writeText(fullAdvisoryText);
      setCopyError(false);
      setCopied(true);
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopied(false), 3000);
    } catch (err: unknown) {
      console.warn(
        "[CommunityHub] Clipboard write failed:",
        err instanceof Error ? err.message : String(err),
      );
      setCopied(false);
      setCopyError(true);
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullAdvisoryText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(fullAdvisoryText)}`;

  return (
    <section
      aria-labelledby="community-hub-heading"
      className="rounded-2xl border border-white/15 bg-[#0d1017] p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6"
    >
      {/* Subtle top edge specular highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="flex h-2 w-2 rounded-full bg-purple-400"
              aria-hidden="true"
            />
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-semibold">
              {t.eyebrow}
            </span>
          </div>
          <h2
            id="community-hub-heading"
            className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5"
          >
            <Users className="h-6 w-6 text-sky-400" aria-hidden="true" />
            {t.title}
          </h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            {t.description}
          </p>
        </div>

        {/* GRAP Statutory Severity Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-white/[0.03] border border-white/20 self-start md:self-auto">
          <Shield className="h-4 w-4 text-purple-400" aria-hidden="true" />
          <span className="text-white">
            {t.grapPrefix} {localizedGrapName}:{" "}
            <strong className="text-purple-300">{localizedSeverity}</strong>
          </span>
        </div>
      </div>

      {/* CAQM GRAP Directives Card */}
      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/15 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <h3 className="font-bold text-sm text-white">
              {localizedGrapName}: {localizedSeverity}
            </h3>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {grapStage.cpcbAqiRange}
          </span>
        </div>

        {/* Citizen Checklist */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
            {t.citizenMandateTitle}
          </h4>
          <ul className="space-y-2 text-xs">
            {grapStage.citizenChecklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2.5 text-neutral-300">
                <CheckCircle2
                  className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{t.grapChecklistActions[item.id] ?? item.action}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* RWA Checklist */}
        {grapStage.rwaChecklist.length > 0 && (
          <div className="space-y-2 border-t border-white/[0.08] pt-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
              {t.rwaMandateTitle}
            </h4>
            <ul className="space-y-2 text-xs">
              {grapStage.rwaChecklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2.5 text-neutral-300">
                  <Shield
                    className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{t.grapChecklistActions[item.id] ?? item.action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Commute & Carpool Simulator */}
      <div
        role="region"
        aria-label={t.carpoolSimulatorTitle}
        className="p-5 rounded-xl bg-white/[0.02] border border-white/15 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <h3 className="font-bold text-sm text-white">{t.carpoolSimulatorTitle}</h3>
          </div>
          <span className="text-xs font-mono text-neutral-400">{t.modalShiftBadge}</span>
        </div>

        {/* Commute Distance Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <label htmlFor={distanceId} className="text-neutral-300 font-medium">
              {t.commuteDistanceLabel}
            </label>
            <span className="text-white font-bold">{commuteDistanceKm} km</span>
          </div>
          <input
            id={distanceId}
            type="range"
            min="2"
            max="60"
            step="1"
            value={commuteDistanceKm}
            aria-valuetext={`${commuteDistanceKm} km`}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(parsed)) {
                setCommuteDistanceKm(parsed);
              }
            }}
            className="w-full"
          />
        </div>

        {/* Transit Mode Selector */}
        <div
          role="group"
          aria-label={t.chosenModeLabel}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
        >
          {(Object.keys(COMMUTE_MODE_PROFILES) as CommuteMode[]).map((mode) => {
            const profile = COMMUTE_MODE_PROFILES[mode];
            const isSelected = chosenMode === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setChosenMode(mode)}
                className={`p-3 rounded-xl text-left border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isSelected
                    ? "bg-white/[0.1] border-sky-400 text-white shadow-md"
                    : "bg-white/[0.02] border-white/40 text-neutral-300 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <div className="font-semibold text-xs text-white">
                  {t.commuteModeLabels[mode]}
                </div>
                <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                  {profile.averageSpeedKmh} {t.speedUnit}
                </div>
              </button>
            );
          })}
        </div>

        {/* Commute Delta Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs pt-1">
          <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
            <span className="text-emerald-300 text-[10px] uppercase block">
              {t.co2AvoidedLabel}
            </span>
            <div className="text-2xl font-bold text-white mt-1">
              {commuteDelta.delta.co2AvoidedGrams.toFixed(0)} g CO₂
            </div>
            <span className="text-neutral-400 text-[10px]">{t.tailpipeSparedNote}</span>
          </div>

          <div className="p-3.5 rounded-lg bg-sky-950/20 border border-sky-500/30">
            <span className="text-sky-300 text-[10px] uppercase block">
              {t.pm25AvoidedLabel}
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              -{commuteDelta.delta.pm25ReductionPct.toFixed(1)}%
            </div>
            <span className="text-neutral-400 text-[10px]">
              {commuteDelta.delta.pm25InhaledAvoidedUg.toFixed(1)} {t.pm25AvoidedNote}
            </span>
          </div>
        </div>
      </div>

      {/* RWA & Society WhatsApp Advisory Dispatcher */}
      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/15 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h3 className="font-bold text-sm text-white">{t.copyAdvisoryTitle}</h3>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {t.oneClickNoticeLabel}
          </span>
        </div>

        {/* Notice Preview */}
        <div className="p-4 rounded-lg bg-black/40 border border-white/15 font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
          {fullAdvisoryText}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void handleCopyAdvisory();
            }}
            className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-white" aria-hidden="true" />
                <span>{t.copiedSuccess}</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span>{t.copyAdvisoryButton}</span>
              </>
            )}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/40 hover:border-white/60 text-white font-medium text-xs flex items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Share2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>{t.shareWhatsAppButton}</span>
            <span className="sr-only">({tCommon.opensInNewTab})</span>
          </a>

          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/40 hover:border-white/60 text-white font-medium text-xs flex items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Share2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
            <span>{t.shareTelegramButton}</span>
            <span className="sr-only">({tCommon.opensInNewTab})</span>
          </a>

          <span role="status" aria-live="polite" className="text-xs font-mono">
            {copied ? (
              <span className="sr-only">{t.copiedSuccess}</span>
            ) : copyError ? (
              <span className="text-amber-300">{t.clipboardBlockedError}</span>
            ) : null}
          </span>

          <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 ml-auto">
            <PhoneCall className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
            <span>
              {t.caqmHotlineLabel} <strong>011-23701213</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
