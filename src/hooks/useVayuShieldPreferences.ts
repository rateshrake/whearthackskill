"use client";

import { useState, useEffect, useCallback } from "react";
import { CITY_PRESETS, type CityPreset, type SupportedLanguage } from "@/i18n/dictionary";
import type { HouseholdArchetype, RoomDimensions } from "@/engine";

const STORAGE_KEYS = {
  LANG: "vayushield_lang",
  CITY: "vayushield_city",
  ARCHETYPE: "vayushield_archetype",
  ROOM_DIMS: "vayushield_room_dims",
} as const;

const DEFAULT_CITY: CityPreset = CITY_PRESETS[0] as CityPreset;

function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch (err: unknown) {
    console.warn(
      `[VayuShield] Failed to read localStorage key "${key}":`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch (err: unknown) {
    console.warn(
      `[VayuShield] Failed to persist localStorage key "${key}":`,
      err instanceof Error ? err.message : String(err),
    );
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function useVayuShieldPreferences() {
  const [selectedCityId, setSelectedCityId] = useState<string>(DEFAULT_CITY.id);
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [selectedArchetype, setSelectedArchetype] =
    useState<HouseholdArchetype>("child_asthma");
  const [roomDimensions, setRoomDimensions] = useState<RoomDimensions>({
    lengthMeters: 5.0,
    widthMeters: 4.0,
    heightMeters: 2.8,
  });

  const activeCity: CityPreset =
    CITY_PRESETS.find((c) => c.id === selectedCityId) ?? DEFAULT_CITY;

  useEffect(() => {
    const savedLang = safeStorageGet(STORAGE_KEYS.LANG);
    if (savedLang === "en" || savedLang === "hi") {
      setLanguage(savedLang);
    }

    const savedCity = safeStorageGet(STORAGE_KEYS.CITY);
    if (savedCity && CITY_PRESETS.some((c) => c.id === savedCity)) {
      setSelectedCityId(savedCity);
    }

    const savedArch = safeStorageGet(STORAGE_KEYS.ARCHETYPE);
    if (
      savedArch === "child_asthma" ||
      savedArch === "older_adult_walker" ||
      savedArch === "office_commuter" ||
      savedArch === "general_adult"
    ) {
      setSelectedArchetype(savedArch);
    }

    const savedDims = safeStorageGet(STORAGE_KEYS.ROOM_DIMS);
    if (savedDims) {
      try {
        const parsed: unknown = JSON.parse(savedDims);
        if (
          parsed !== null &&
          typeof parsed === "object" &&
          !Array.isArray(parsed) &&
          "lengthMeters" in parsed &&
          "widthMeters" in parsed &&
          "heightMeters" in parsed &&
          typeof parsed.lengthMeters === "number" &&
          typeof parsed.widthMeters === "number" &&
          typeof parsed.heightMeters === "number" &&
          Number.isFinite(parsed.lengthMeters) &&
          Number.isFinite(parsed.widthMeters) &&
          Number.isFinite(parsed.heightMeters)
        ) {
          setRoomDimensions({
            lengthMeters: clamp(parsed.lengthMeters, 2.5, 12.0),
            widthMeters: clamp(parsed.widthMeters, 2.5, 10.0),
            heightMeters: clamp(parsed.heightMeters, 2.4, 4.5),
          });
        }
      } catch (err: unknown) {
        console.warn(
          "[VayuShield] Invalid persisted room dimensions ignored:",
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const handleLanguageToggle = useCallback(() => {
    setLanguage((prev) => {
      const nextLang: SupportedLanguage = prev === "en" ? "hi" : "en";
      safeStorageSet(STORAGE_KEYS.LANG, nextLang);
      return nextLang;
    });
  }, []);

  const handleCityChange = useCallback((cityId: string) => {
    setSelectedCityId(cityId);
    safeStorageSet(STORAGE_KEYS.CITY, cityId);
  }, []);

  const handleArchetypeChange = useCallback((arch: HouseholdArchetype) => {
    setSelectedArchetype(arch);
    safeStorageSet(STORAGE_KEYS.ARCHETYPE, arch);
  }, []);

  const handleRoomDimensionsChange = useCallback((dims: RoomDimensions) => {
    setRoomDimensions(dims);
    safeStorageSet(STORAGE_KEYS.ROOM_DIMS, JSON.stringify(dims));
  }, []);

  return {
    selectedCityId,
    activeCity,
    language,
    selectedArchetype,
    roomDimensions,
    handleLanguageToggle,
    handleCityChange,
    handleArchetypeChange,
    handleRoomDimensionsChange,
  };
}
