import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  aggregateAirIntelligence,
  generateAdvisorBriefing,
  globalRateLimiter,
  applySecurityHeaders,
  type AdvisorMetricsInput,
} from "@/services";
import { mapAqiToGrapStage } from "@/engine";

const IntelligenceQuerySchema = z.object({
  lat: z
    .string({ message: "Latitude is required" })
    .min(1, "Latitude is required")
    .refine(
      (v) => !Number.isNaN(Number(v)) && v.trim() !== "",
      "Latitude must be a valid number",
    )
    .transform((v) => Number(v))
    .pipe(
      z
        .number()
        .min(-90, "Latitude must be between -90 and 90")
        .max(90, "Latitude must be between -90 and 90"),
    ),
  lon: z
    .string({ message: "Longitude is required" })
    .min(1, "Longitude is required")
    .refine(
      (v) => !Number.isNaN(Number(v)) && v.trim() !== "",
      "Longitude must be a valid number",
    )
    .transform((v) => Number(v))
    .pipe(
      z
        .number()
        .min(-180, "Longitude must be between -180 and 180")
        .max(180, "Longitude must be between -180 and 180"),
    ),
  lang: z.enum(["en", "hi"]).default("en"),
  archetype: z
    .enum(["child_asthma", "older_adult_walker", "office_commuter", "general_adult"])
    .default("child_asthma"),
});

export async function GET(request: NextRequest) {
  // 1. Sliding-Window Rate Limiter
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  const rateLimit = globalRateLimiter.check(ip);
  if (!rateLimit.allowed) {
    const errorResponse = NextResponse.json(
      {
        error: "Too Many Requests",
        message: "Sliding-window rate limit exceeded. Please throttle requests.",
        limit: rateLimit.limit,
        retryAfterSeconds: rateLimit.resetSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimit.resetSeconds.toString(),
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
    return applySecurityHeaders(errorResponse);
  }

  // 2. Validate input parameters
  const { searchParams } = new URL(request.url);
  const rawLat = searchParams.get("lat");
  const rawLon = searchParams.get("lon");
  const rawLang = searchParams.get("lang") ?? "en";
  const rawArchetype = searchParams.get("archetype") ?? "child_asthma";

  const validation = IntelligenceQuerySchema.safeParse({
    lat: rawLat ?? undefined,
    lon: rawLon ?? undefined,
    lang: rawLang,
    archetype: rawArchetype,
  });

  if (!validation.success) {
    const badRequest = NextResponse.json(
      {
        error: "Bad Request",
        message: "Invalid parameters provided to intelligence engine.",
        issues: validation.error.format(),
      },
      { status: 400 },
    );
    return applySecurityHeaders(badRequest);
  }

  const { lat, lon, lang, archetype } = validation.data;

  try {
    const payload = await aggregateAirIntelligence(lat, lon);
    const grapStage = mapAqiToGrapStage(payload.currentConditions.cpcb.aqi);

    const advisorInput: AdvisorMetricsInput = {
      cpcbAqi: payload.currentConditions.cpcb.aqi,
      cpcbCategory: payload.currentConditions.cpcb.category,
      usEpaAqi: payload.currentConditions.usEpa.aqi,
      usEpaCategory: payload.currentConditions.usEpa.category,
      satisfactoryIllusionAlert: payload.currentConditions.satisfactoryIllusionAlert,
      cleanestWindowTime: payload.diurnalAnalysis.cleanestToday
        ? `${payload.diurnalAnalysis.cleanestToday.startTimeIso.slice(11, 16)} - ${payload.diurnalAnalysis.cleanestToday.endTimeIso.slice(11, 16)} UTC`
        : "14:00 - 16:00",
      cleanestWindowPm25: payload.diurnalAnalysis.cleanestToday?.averagePm25 ?? 55.0,
      worstWindowTime: payload.diurnalAnalysis.worstToday
        ? `${payload.diurnalAnalysis.worstToday.startTimeIso.slice(11, 16)} - ${payload.diurnalAnalysis.worstToday.endTimeIso.slice(11, 16)} UTC`
        : "06:00 - 08:00",
      worstWindowPm25: payload.diurnalAnalysis.worstToday?.averagePm25 ?? 220.0,
      grapStageId: grapStage.stage,
      grapStageName: grapStage.stageName,
      archetype,
      archetypeLabel:
        archetype === "child_asthma"
          ? "Child with Asthma"
          : archetype === "older_adult_walker"
            ? "Older Adult (Morning Walker)"
            : archetype === "office_commuter"
              ? "Office Commuter"
              : "General Adult",
      upwindFireAlignment: payload.upwindFireContext.alignment,
      language: lang,
    };

    const advisorResult = await generateAdvisorBriefing(advisorInput);

    const response = NextResponse.json(
      {
        intelligence: payload,
        advisor: advisorResult,
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      },
    );

    return applySecurityHeaders(response);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Intelligence Failure";
    const serverError = NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 },
    );
    return applySecurityHeaders(serverError);
  }
}
