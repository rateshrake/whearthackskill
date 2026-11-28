import { type NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  getAllCircuitStatuses,
  getMetricsSnapshot,
  globalAdvisorCache,
  globalFirmsCache,
  globalForecastCache,
  globalRateLimiter,
  globalStationCache,
  handleGuardedApiRoute,
  isDirectOrVerifiedLoopback,
} from "@/services";

function hasValidHealthToken(request: NextRequest): boolean {
  const expectedToken = process.env.HEALTHCHECK_TOKEN?.trim();
  if (!expectedToken) return false;
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const supplied = authHeader.slice("Bearer ".length).trim();
  if (!supplied) return false;

  const expectedBuf = Buffer.from(expectedToken, "utf8");
  const suppliedBuf = Buffer.from(supplied, "utf8");
  if (expectedBuf.length !== suppliedBuf.length) return false;
  return timingSafeEqual(expectedBuf, suppliedBuf);
}

export async function GET(request: NextRequest) {
  return handleGuardedApiRoute("/api/health", request, async ({ rateLimitHeaders }) => {
    const circuits = getAllCircuitStatuses();
    const openCircuits = circuits.filter((c) => c.state === "open").length;
    const status = openCircuits > 0 ? "degraded" : "ok";
    const timestampIso = new Date().toISOString();

    const isPrivileged =
      isDirectOrVerifiedLoopback(request) || hasValidHealthToken(request);

    if (!isPrivileged) {
      return NextResponse.json(
        {
          status,
          timestampIso,
        },
        { status: 200, headers: rateLimitHeaders },
      );
    }

    return NextResponse.json(
      {
        status,
        timestampIso,
        uptimeSeconds: Math.floor(process.uptime()),
        caches: {
          station: globalStationCache.getStats(),
          forecast: globalForecastCache.getStats(),
          firms: globalFirmsCache.getStats(),
          advisor: globalAdvisorCache.getStats(),
        },
        rateLimiter: globalRateLimiter.getStats(),
        circuitBreakers: circuits,
        metrics: getMetricsSnapshot(),
        providersConfigured: {
          googleMaps: Boolean(process.env.GOOGLE_MAPS_API_KEY),
          openMeteo: true,
          waqi: Boolean(process.env.WAQI_TOKEN),
          openAq: Boolean(process.env.OPENAQ_API_KEY),
          nasaFirms: Boolean(process.env.NASA_FIRMS_MAP_KEY),
          gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
        },
      },
      { status: 200, headers: rateLimitHeaders },
    );
  });
}
