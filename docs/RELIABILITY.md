# Reliability

## Integration-Point Audit
| Dependency | Timeout | Circuit Breaker | Bulkhead / Bound | Retry Policy | Status |
|---|---|---|---|---|---|
| Google Maps Air Quality API (`POST`) | 3500 ms (`AbortSignal.timeout`) | `CircuitBreaker("google_maps")` (5 failures / 30s) | 512 KB response cap, `X-Goog-Api-Key` header, `redirect: "error"` | None (POST failover to Open-Meteo) | Hardened |
| Open-Meteo Air Quality API (`GET`) | 4000 ms (`AbortSignal.timeout`) | `CircuitBreaker("open_meteo_aq")` (5 failures / 30s) | 512 KB response cap, `timezone=UTC`, single-flight coalescing | 1 jittered retry (75–200 ms) on 429/5xx/network | Hardened |
| Open-Meteo Weather Wind API (`GET`) | 3000 ms (`AbortSignal.timeout`) | `CircuitBreaker("open_meteo_weather")` | 512 KB response cap, `redirect: "error"` | 1 jittered retry (75–200 ms) | Hardened |
| WAQI / AQICN Station API (`GET`) | 3000 ms (`AbortSignal.timeout`) | `CircuitBreaker("waqi")` | 512 KB response cap, 30m `GridCache`, OpenAQ failover | 1 jittered retry (75–200 ms) | Hardened |
| OpenAQ v3 Locations API (`GET`) | 3000 ms (`AbortSignal.timeout`) | `CircuitBreaker("openaq")` | 512 KB response cap, `X-API-Key` header | 1 jittered retry (75–200 ms) | Hardened |
| NASA FIRMS VIIRS CSV (`GET`) | 3500 ms (`AbortSignal.timeout`) | `CircuitBreaker("nasa_firms")` | 2 MB response cap, 60m `GridCache`, bounded bbox | 1 jittered retry (75–200 ms) | Hardened |
| Google Gemini Interactions (`POST`) | 3500 ms (`timeout_ms` + `AbortController`) | `CircuitBreaker("gemini")` | 16 KB inbound `/api/advisor` cap, deterministic fallback, `store: false` | `retries: { strategy: "none" }` | Hardened |

## Query & Resource Findings
- **In-Memory Rate Limiter**: Bounded to `maxEntries: 10_000` with LRU eviction and periodic stale sweeps every `100` checks (plus in-place pruning on denied requests).
- **Grid Caches**: Bounded LRU capacities (`1000` station, `500` forecast, `500` FIRMS) with `0.01°` coordinate quantization (normalized `+0`) and single-flight request coalescing per `gridKey`.
- **Client Fetch Cancellation**: `src/app/page.tsx` aborts in-flight `/api/intelligence` requests via `AbortController` + monotonic request ID guard to prevent stale updates.

## Health Checks & Metrics
- **Deep Health Check**: `GET /api/health` (`src/app/api/health/route.ts`) returns `200` with `status` (`"ok"` or `"degraded"` when any circuit breaker is open), uptime, cache stats, rate-limiter capacity stats, circuit breaker states, RED metrics, and boolean provider config flags (zero secret values).
- **Docker Healthcheck**: `Dockerfile` `HEALTHCHECK` polls `http://127.0.0.1:8080/api/health` (lightweight JSON check instead of full SSR `/` page render).
- **RED Metrics**: `src/services/observability.ts` tracks request Rate, 5xx/429 Errors, and Duration across fixed allowlisted route & upstream provider keys (zero unbounded cardinality).

## Deploy vs Release & Needs-Validation Notes
- **Stateless Rollback**: Cloud Run revisions support instant traffic shifting back to prior image digests with zero schema migrations.
- **Deployment `needs_validation` Items**:
  1. Verify in target Cloud Run / Cloud Load Balancer environment whether `TRUSTED_PROXY_HOPS` should remain `1` (direct Cloud Run GFE) or be set to `2` (Cloud LB -> Cloud Run).
  2. Verify production `GET /` responses from Cloud Run deliver non-empty cryptographic nonces in `Content-Security-Policy` with zero browser console CSP errors.
