"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { CityPreset, SupportedLanguage } from "@/i18n/dictionary";
import type { AirIntelligencePayload } from "@/services/airQualityAggregator";
import type { AdvisorExecutionResult } from "@/services/geminiAdvisor";
import type { HouseholdArchetype } from "@/engine";

export function useAirIntelligence(
  activeCity: CityPreset,
  language: SupportedLanguage,
  selectedArchetype: HouseholdArchetype,
) {
  const [intelligence, setIntelligence] = useState<AirIntelligencePayload | null>(null);
  const [advisor, setAdvisor] = useState<AdvisorExecutionResult | null>(null);
  const [advisorArchetype, setAdvisorArchetype] =
    useState<HouseholdArchetype>(selectedArchetype);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const archetypeRef = useRef<HouseholdArchetype>(selectedArchetype);
  useEffect(() => {
    archetypeRef.current = selectedArchetype;
  }, [selectedArchetype]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);

  const fetchIntelligence = useCallback(
    async (city: CityPreset, lang: SupportedLanguage) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestId = ++requestSeqRef.current;
      const requestedArchetype = archetypeRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          lat: city.lat.toString(),
          lon: city.lon.toString(),
          lang,
          archetype: requestedArchetype,
        });

        const res = await fetch(`/api/intelligence?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Upstream API responded with HTTP ${res.status}`);
        }

        const data = (await res.json()) as {
          intelligence: AirIntelligencePayload;
          advisor: AdvisorExecutionResult;
        };

        if (requestId === requestSeqRef.current) {
          setIntelligence(data.intelligence);
          setAdvisor(data.advisor);
          setAdvisorArchetype(requestedArchetype);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (requestId === requestSeqRef.current) {
          const msg = err instanceof Error ? err.message : "Failed to load air data";
          setError(msg);
        }
      } finally {
        if (requestId === requestSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void fetchIntelligence(activeCity, language);
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [activeCity, language, fetchIntelligence]);

  return {
    intelligence,
    advisor,
    advisorArchetype,
    isLoading,
    error,
    fetchIntelligence,
  };
}
