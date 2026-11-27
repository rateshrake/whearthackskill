import { type NextRequest, NextResponse } from "next/server";
import {
  getAllCircuitStatuses,
  getMetricsSnapshot,
  globalFirmsCache,
  globalForecastCache,
  globalRateLimiter,
  globalStationCache,
  handleGuardedApiRoute,
} from "@/services";

export async function GET(request: NextRequest) {
  return handleGuardedApiRoute(
    "/api/health",
    request,
    async () => {
      const circuits = getAllCircuitStatuses();
      const openCircuits = circuits.filter((c) => c.state === "open").length;

      return NextResponse.json(
        {
          status: openCircuits > 0 ? "degraded" : "ok",
          timestampIso: new Date().toISOString(),
          uptimeSeconds: Math.floor(process.uptime()),
          caches: {
            station: globalStationCache.getStats(),
            forecast: globalForecastCache.getStats(),
            firms: globalFirmsCache.getStats(),
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
        { status: 200 },
      );
    },
    { skipRateLimit: true },
  );
}
