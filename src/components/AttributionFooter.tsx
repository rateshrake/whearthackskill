"use client";

import React from "react";
import { DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import { Database, HeartPulse } from "lucide-react";

export interface AttributionFooterProps {
  language: SupportedLanguage;
}

export function AttributionFooter({ language }: AttributionFooterProps) {
  const t = DICTIONARY[language].attributions;

  return (
    <footer
      aria-labelledby="attribution-footer-heading"
      className="mt-16 pt-10 pb-16 border-t border-white/15 text-neutral-400 text-xs space-y-8"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Heading */}
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-sky-400" aria-hidden="true" />
          <h2
            id="attribution-footer-heading"
            className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider"
          >
            {t.title}
          </h2>
        </div>

        {/* Attribution Cards Grid */}
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* CAMS Open-Meteo */}
          <li className="p-4 rounded-xl bg-white/[0.02] border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-white font-semibold">
              <span>Open-Meteo & CAMS</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-neutral-300 border border-white/20">
                CC BY 4.0
              </span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">{t.camsCredit}</p>
          </li>

          {/* WAQI / CPCB */}
          <li className="p-4 rounded-xl bg-white/[0.02] border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-white font-semibold">
              <span>WAQI & CPCB</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-neutral-300 border border-white/20">
                EPA / CPCB Protocol
              </span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">{t.waqiCredit}</p>
          </li>

          {/* NASA FIRMS */}
          <li className="p-4 rounded-xl bg-white/[0.02] border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-white font-semibold">
              <span>NASA FIRMS</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-neutral-300 border border-white/20">
                VIIRS SNPP NRT
              </span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              {t.nasaFirmsCredit}
            </p>
          </li>

          {/* OpenAQ */}
          <li className="p-4 rounded-xl bg-white/[0.02] border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-white font-semibold">
              <span>OpenAQ Community</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-neutral-300 border border-white/20">
                v3 REST API
              </span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              {t.openaqCredit}
            </p>
          </li>

          {/* Google Maps Air Quality */}
          <li className="p-4 rounded-xl bg-white/[0.02] border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-white font-semibold">
              <span>Google Maps Platform</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-neutral-300 border border-white/20">
                Air Quality API
              </span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              {t.googleMapsCredit}
            </p>
          </li>

          {/* Clinical Health Disclaimer Card */}
          <li className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between text-slate-200 font-semibold">
              <span className="flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4 text-sky-400" aria-hidden="true" />
                {t.medicalDisclaimerTitle}
              </span>
            </div>
            <p className="text-neutral-300 text-[11px] leading-relaxed">{t.disclaimer}</p>
          </li>
        </ul>

        {/* Legal Disclaimers & Copyright */}
        <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-400 font-mono">
          <span>{t.footerTagline}</span>
          <span>{t.footerSubTagline}</span>
        </div>
      </div>
    </footer>
  );
}
