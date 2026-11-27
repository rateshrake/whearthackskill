/**
 * VayuShield Backend Services
 * Module: schemas.ts
 *
 * Shared Zod input validation schemas and text sanitizers for HTTP API routes.
 */

import { z } from "zod";

function sanitizeSingleLine(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const latitudeSchema = z
  .string({ message: "Latitude is required" })
  .min(1, "Latitude is required")
  .max(32, "Latitude string too long")
  .refine(
    (v) => v.trim() !== "" && Number.isFinite(Number(v)),
    "Latitude must be a valid number",
  )
  .transform((v) => Number(v))
  .pipe(
    z
      .number()
      .min(-90, "Latitude must be between -90 and 90")
      .max(90, "Latitude must be between -90 and 90"),
  );

const longitudeSchema = z
  .string({ message: "Longitude is required" })
  .min(1, "Longitude is required")
  .max(32, "Longitude string too long")
  .refine(
    (v) => v.trim() !== "" && Number.isFinite(Number(v)),
    "Longitude must be a valid number",
  )
  .transform((v) => Number(v))
  .pipe(
    z
      .number()
      .min(-180, "Longitude must be between -180 and 180")
      .max(180, "Longitude must be between -180 and 180"),
  );

export const CoordinatesQuerySchema = z.object({
  lat: latitudeSchema,
  lon: longitudeSchema,
});

export const IntelligenceQuerySchema = z.object({
  lat: latitudeSchema,
  lon: longitudeSchema,
  lang: z.enum(["en", "hi"]).default("en"),
  archetype: z
    .enum(["child_asthma", "older_adult_walker", "office_commuter", "general_adult"])
    .default("child_asthma"),
});

export const CpcbCategorySchema = z.enum([
  "Good",
  "Satisfactory",
  "Moderate",
  "Poor",
  "Very Poor",
  "Severe",
]);

export const UsEpaCategorySchema = z.enum([
  "Good",
  "Moderate",
  "Unhealthy for Sensitive Groups",
  "Unhealthy",
  "Very Unhealthy",
  "Hazardous",
]);

export const AdvisorRequestSchema = z.object({
  cpcbAqi: z.number().finite().min(0).max(2000),
  cpcbCategory: CpcbCategorySchema,
  usEpaAqi: z.number().finite().min(0).max(2000),
  usEpaCategory: UsEpaCategorySchema,
  satisfactoryIllusionAlert: z.boolean(),
  cleanestWindowTime: z
    .string()
    .min(1)
    .max(80)
    .transform(sanitizeSingleLine)
    .refine((v) => v.length >= 1, "cleanestWindowTime is required"),
  cleanestWindowPm25: z.number().finite().min(0).max(2000),
  worstWindowTime: z
    .string()
    .min(1)
    .max(80)
    .transform(sanitizeSingleLine)
    .refine((v) => v.length >= 1, "worstWindowTime is required"),
  worstWindowPm25: z.number().finite().min(0).max(2000),
  grapStageId: z.enum(["stage_0", "stage_1", "stage_2", "stage_3", "stage_4"]),
  grapStageName: z
    .string()
    .min(1)
    .max(80)
    .transform(sanitizeSingleLine)
    .refine((v) => v.length >= 1, "grapStageName is required"),
  archetype: z.enum([
    "child_asthma",
    "older_adult_walker",
    "office_commuter",
    "general_adult",
  ]),
  archetypeLabel: z
    .string()
    .min(1)
    .max(80)
    .transform(sanitizeSingleLine)
    .refine((v) => v.length >= 1, "archetypeLabel is required"),
  upwindFireAlignment: z.enum(["upwind_aligned", "crosswind", "none_detected"]),
  language: z.enum(["en", "hi"]).default("en"),
});
