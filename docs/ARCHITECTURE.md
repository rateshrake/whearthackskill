# Architecture

## System Context
- **Product**: VayuShield — bilingual urban air quality & exposure physics navigator targeting Delhi-NCR and Indian urban centers.
- **Deployment Profile**: Single/low-traffic stateless Next.js 15 container on Google Cloud Run (`asia-south1`, non-root user `nextjs`, port `8080`, zero persistent database).
- **Secrets Management**: All API keys (`GOOGLE_MAPS_API_KEY`, `WAQI_TOKEN`, `OPENAQ_API_KEY`, `NASA_FIRMS_MAP_KEY`, `GEMINI_API_KEY`) live strictly in server runtime environment variables (Google Secret Manager), never exposed to browser bundles or URL logs.

## Layer Map & Dependency Rule

Dependencies strictly point inward toward pure domain physics:

1. **Entities / Domain Kernel (`src/engine/`)**:
   - `aqiBreakpoints.ts`, `diurnalOptimizer.ts`, `indoorPhysics.ts`, `grapAndEmissions.ts`
   - Zero imports from Next.js, Node built-ins, `process.env`, React, or network APIs.
2. **Use-Case Orchestration & Guarded Services (`src/services/`)**:
   - `airQualityAggregator.ts`: coordinates parallel provider adapters, single-flight coalescing, and grid caching, invoking pure `src/engine/` physics.
   - `geminiAdvisor.ts`: guarded qualitative advisory layer behind `AdvisorInteractionRunner` port + Unicode digit rejection (`/\p{Nd}/u`) + Zod schema.
   - `httpApiGuard.ts`, `resilientHttp.ts`, `rateLimiter.ts`, `gridCache.ts`, `observability.ts`, `securityHeaders.ts`, `schemas.ts`: cross-cutting HTTP, rate-limit, circuit-breaker, and security boundaries.
3. **Outer Provider Adapters (`src/services/providers/`)**:
   - `primaryAirQuality.ts` (Google Maps AQ header-auth + Open-Meteo UTC failover)
   - `groundStation.ts` (WAQI + OpenAQ v3 + shared skew classification)
   - `upwindFire.ts` (Open-Meteo wind + NASA FIRMS CSV parser)
   - `geoMath.ts` (pure Haversine & compass bearing math)
4. **Delivery Frameworks (`src/app/`, `src/middleware.ts`, `src/components/`)**:
   - Thin API route handlers (`/api/air-quality`, `/api/advisor`, `/api/intelligence`, `/api/health`) delegating entirely to `httpApiGuard` and services.
   - Middleware + dynamic `RootLayout` enforcing per-request nonce CSP.
   - Client UI invoking `src/engine/` synchronously for zero-latency slider updates wrapped in `ErrorBoundary`.

| Violation / Boundary Finding | Location | Fix Applied | Status |
|---|---|---|---|
| API routes duplicated IP parsing, rate limiting, Zod schemas, and leaked raw `error.message` | `src/app/api/*/route.ts` | Extracted `httpApiGuard.ts` + `schemas.ts`; sanitized 500 responses | Closed |
| `airQualityAggregator.ts` mixed transport, DTO parsing, caching, and orchestration (723 lines) | `src/services/airQualityAggregator.ts` | Extracted `resilientHttp.ts` + `src/services/providers/*` adapters | Closed |
| `geminiAdvisor.ts` used raw `fetch` with `?key=` query param & deprecated `gemini-2.5-flash` | `src/services/geminiAdvisor.ts` | Migrated to `@google/genai` Interactions API (`gemini-4-hydrogen`) behind `AdvisorInteractionRunner` port | Closed |
| Sequential `fetchGroundStationData` added tail latency after primary forecast | `src/services/airQualityAggregator.ts` | Split raw station fetch from `classifyStationSkew` so all 3 providers run in parallel | Closed |

## Decision Log
| Date | Decision | Rationale |
|---|---|---|
| 2026-11-27 | Keep `src/engine/` 100% framework-free isomorphic TypeScript | Allows deterministic unit testing and zero-network client slider math. |
| 2026-11-27 | Parse `X-Forwarded-For` from the right with `TRUSTED_PROXY_HOPS=1` | Prevents leftmost `XFF` header spoofing against per-IP rate limiting on Cloud Run. |
| 2026-11-27 | Use `@google/genai` `interactions.create` with `store: false` and `gemini-4-hydrogen` | Replaces deprecated `gemini-2.5-flash`, removes URL key query parameters, and separates `system_instruction` from metrics input. |
| 2026-11-27 | Use dynamic SSR + per-request CSP nonces in `middleware.ts` and `layout.tsx` | Eliminates `'unsafe-eval'` and `'unsafe-inline'` in production `script-src`. |
| 2026-11-27 | Skip `improve-code-quality` Phases 8–9 (Redis / DB sharding) | Single/low-traffic stateless Cloud Run target profile does not warrant distributed store complexity. |

## Data & Storage Decisions
- No database or persistent data store (`Phase 9` skipped). Browser persistence is strictly client-side non-secret preferences (`localStorage`) validated and clamped on read.
