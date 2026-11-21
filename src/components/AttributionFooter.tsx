"use client";

import React from "react";
import { DICTIONARY, type SupportedLanguage } from "@/i18n/dictionary";
import { Database, Globe, HeartPulse } from "lucide-react";

export interface AttributionFooterProps {
  language: SupportedLanguage;
}

export function AttributionFooter({ language }: AttributionFooterProps) {
  const t = DICTIONARY[language].attributions;

  return (
    <footer
      aria-labelledby="attribution-footer-heading"
      className="mt-12 pt-8 pb-12 border-t border-slate-800 text-slate-400 text-xs space-y-8"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Heading */}
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <h2
            id="attribution-footer-heading"
            className="text-sm font-bold text-slate-300 uppercase tracking-wider"
          >
            {t.title}
          </h2>
        </div>

        {/* Attribution Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* CAMS Open-Meteo */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span>Open-Meteo & CAMS</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                CC BY 4.0
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">{t.camsCredit}</p>
          </div>

          {/* WAQI / CPCB */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span>WAQI & CPCB</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                EPA / CPCB Protocol
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">{t.waqiCredit}</p>
          </div>

          {/* NASA FIRMS */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span>NASA FIRMS</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                VIIRS SNPP NRT
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {t.nasaFirmsCredit}
            </p>
          </div>

          {/* OpenAQ */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span>OpenAQ Community</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                v3 REST API
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">{t.openaqCredit}</p>
          </div>

          {/* Google Maps Air Quality */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span>Google Maps Platform</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Air Quality API
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {t.googleMapsCredit}
            </p>
          </div>

          {/* Clinical Health Disclaimer Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-900/40 space-y-2">
            <div className="flex items-center justify-between text-amber-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4 text-amber-400" aria-hidden="true" />
                Medical Disclaimer
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">{t.disclaimer}</p>
          </div>
        </div>

        {/* Bottom copyright & tagline */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px]">
          <div>
            &copy; {new Date().getFullYear()} VayuShield &mdash; PromptWars Virtual
            Challenge 6. Isomorphic Environmental Physics & Respiratory Protection.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <Globe className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Asia/Kolkata (IST)
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
