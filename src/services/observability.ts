/**
 * VayuShield Backend Services
 * Module: observability.ts
 *
 * Bounded-cardinality RED (Rate, Errors, Duration) metrics collector
 * for API endpoints and upstream environmental/AI integrations.
 */

export type MonitoredRoute =
  "/api/intelligence" | "/api/air-quality" | "/api/advisor" | "/api/health";

export type UpstreamProviderName =
  | "google_maps"
  | "open_meteo_aq"
  | "open_meteo_weather"
  | "waqi"
  | "openaq"
  | "nasa_firms"
  | "gemini";

export interface RouteMetricEntry {
  requests: number;
  errors5xx: number;
  rateLimited429: number;
  totalDurationMs: number;
  avgDurationMs: number;
}

export interface UpstreamMetricEntry {
  calls: number;
  failures: number;
  totalDurationMs: number;
  avgDurationMs: number;
}

export interface MetricsSnapshot {
  routes: Record<MonitoredRoute, RouteMetricEntry>;
  upstreams: Record<UpstreamProviderName, UpstreamMetricEntry>;
}

const ROUTES: readonly MonitoredRoute[] = [
  "/api/intelligence",
  "/api/air-quality",
  "/api/advisor",
  "/api/health",
];

const UPSTREAMS: readonly UpstreamProviderName[] = [
  "google_maps",
  "open_meteo_aq",
  "open_meteo_weather",
  "waqi",
  "openaq",
  "nasa_firms",
  "gemini",
];

interface MutableCounter {
  requests: number;
  errors5xx: number;
  rateLimited429: number;
  totalDurationMs: number;
}

interface MutableUpstreamCounter {
  calls: number;
  failures: number;
  totalDurationMs: number;
}

function createInitialRoutes(): Record<MonitoredRoute, MutableCounter> {
  return {
    "/api/intelligence": {
      requests: 0,
      errors5xx: 0,
      rateLimited429: 0,
      totalDurationMs: 0,
    },
    "/api/air-quality": {
      requests: 0,
      errors5xx: 0,
      rateLimited429: 0,
      totalDurationMs: 0,
    },
    "/api/advisor": { requests: 0, errors5xx: 0, rateLimited429: 0, totalDurationMs: 0 },
    "/api/health": { requests: 0, errors5xx: 0, rateLimited429: 0, totalDurationMs: 0 },
  };
}

function createInitialUpstreams(): Record<UpstreamProviderName, MutableUpstreamCounter> {
  return {
    google_maps: { calls: 0, failures: 0, totalDurationMs: 0 },
    open_meteo_aq: { calls: 0, failures: 0, totalDurationMs: 0 },
    open_meteo_weather: { calls: 0, failures: 0, totalDurationMs: 0 },
    waqi: { calls: 0, failures: 0, totalDurationMs: 0 },
    openaq: { calls: 0, failures: 0, totalDurationMs: 0 },
    nasa_firms: { calls: 0, failures: 0, totalDurationMs: 0 },
    gemini: { calls: 0, failures: 0, totalDurationMs: 0 },
  };
}

let routeCounters = createInitialRoutes();
let upstreamCounters = createInitialUpstreams();

export function recordRouteMetric(
  route: MonitoredRoute,
  status: number,
  durationMs: number,
): void {
  const entry = routeCounters[route];
  entry.requests++;
  if (status >= 500) entry.errors5xx++;
  if (status === 429) entry.rateLimited429++;
  entry.totalDurationMs += Math.max(0, durationMs);
}

export function recordUpstreamMetric(
  provider: UpstreamProviderName,
  success: boolean,
  durationMs: number,
): void {
  const entry = upstreamCounters[provider];
  entry.calls++;
  if (!success) entry.failures++;
  entry.totalDurationMs += Math.max(0, durationMs);
}

export function getMetricsSnapshot(): MetricsSnapshot {
  const routes = {} as Record<MonitoredRoute, RouteMetricEntry>;
  for (const r of ROUTES) {
    const c = routeCounters[r];
    routes[r] = {
      requests: c.requests,
      errors5xx: c.errors5xx,
      rateLimited429: c.rateLimited429,
      totalDurationMs: Number(c.totalDurationMs.toFixed(1)),
      avgDurationMs:
        c.requests > 0 ? Number((c.totalDurationMs / c.requests).toFixed(1)) : 0,
    };
  }

  const upstreams = {} as Record<UpstreamProviderName, UpstreamMetricEntry>;
  for (const u of UPSTREAMS) {
    const c = upstreamCounters[u];
    upstreams[u] = {
      calls: c.calls,
      failures: c.failures,
      totalDurationMs: Number(c.totalDurationMs.toFixed(1)),
      avgDurationMs: c.calls > 0 ? Number((c.totalDurationMs / c.calls).toFixed(1)) : 0,
    };
  }

  return { routes, upstreams };
}

export function resetMetrics(): void {
  routeCounters = createInitialRoutes();
  upstreamCounters = createInitialUpstreams();
}
