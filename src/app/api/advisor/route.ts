import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateAdvisorBriefing,
  globalRateLimiter,
  applySecurityHeaders,
  type AdvisorMetricsInput,
} from "@/services";

const AdvisorRequestSchema = z.object({
  cpcbAqi: z.number().min(0).max(2000),
  cpcbCategory: z.string().min(1),
  usEpaAqi: z.number().min(0).max(2000),
  usEpaCategory: z.string().min(1),
  satisfactoryIllusionAlert: z.boolean(),
  cleanestWindowTime: z.string().min(1),
  cleanestWindowPm25: z.number().min(0),
  worstWindowTime: z.string().min(1),
  worstWindowPm25: z.number().min(0),
  grapStageId: z.enum(["stage_0", "stage_1", "stage_2", "stage_3", "stage_4"]),
  grapStageName: z.string().min(1),
  archetype: z.enum([
    "child_asthma",
    "older_adult_walker",
    "office_commuter",
    "general_adult",
  ]),
  archetypeLabel: z.string().min(1),
  upwindFireAlignment: z.enum(["upwind_aligned", "crosswind", "none_detected"]),
  language: z.enum(["en", "hi"]).default("en"),
});

export async function POST(request: NextRequest) {
  // 1. Rate Limiting Check
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

  // 2. Body Parsing & Zod Validation
  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    const invalidJson = NextResponse.json(
      { error: "Bad Request", message: "Invalid JSON request payload." },
      { status: 400 },
    );
    return applySecurityHeaders(invalidJson);
  }

  const validation = AdvisorRequestSchema.safeParse(bodyJson);
  if (!validation.success) {
    const badRequest = NextResponse.json(
      {
        error: "Bad Request",
        message: "Schema validation failed on environmental metrics input.",
        issues: validation.error.format(),
      },
      { status: 400 },
    );
    return applySecurityHeaders(badRequest);
  }

  const input: AdvisorMetricsInput = validation.data;

  // 3. Execution via Guarded Advisor Layer
  try {
    const result = await generateAdvisorBriefing(input);
    const successResponse = NextResponse.json(result, {
      status: 200,
      headers: {
        "X-RateLimit-Limit": rateLimit.limit.toString(),
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      },
    });
    return applySecurityHeaders(successResponse);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Advisor Service Failure";
    const serverError = NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 },
    );
    return applySecurityHeaders(serverError);
  }
}
