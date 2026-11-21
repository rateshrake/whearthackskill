import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  aggregateAirIntelligence,
  globalRateLimiter,
  applySecurityHeaders,
} from "@/services";

const CoordinatesQuerySchema = z.object({
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
});

export async function GET(request: NextRequest) {
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

  // 2. Input Validation via Zod
  const { searchParams } = new URL(request.url);
  const rawLat = searchParams.get("lat");
  const rawLon = searchParams.get("lon");

  const validation = CoordinatesQuerySchema.safeParse({
    lat: rawLat ?? undefined,
    lon: rawLon ?? undefined,
  });

  if (!validation.success) {
    const badRequest = NextResponse.json(
      {
        error: "Bad Request",
        message: "Invalid geographical coordinates provided.",
        issues: validation.error.format(),
      },
      { status: 400 },
    );
    return applySecurityHeaders(badRequest);
  }

  const { lat, lon } = validation.data;

  // 3. Multi-source Ingestion & Resilient Aggregation
  try {
    const payload = await aggregateAirIntelligence(lat, lon);
    const successResponse = NextResponse.json(payload, {
      status: 200,
      headers: {
        "X-RateLimit-Limit": rateLimit.limit.toString(),
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      },
    });
    return applySecurityHeaders(successResponse);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Aggregation Failure";
    const serverError = NextResponse.json(
      {
        error: "Internal Server Error",
        message,
      },
      { status: 500 },
    );
    return applySecurityHeaders(serverError);
  }
}
