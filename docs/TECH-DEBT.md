# Technical Debt

## Debt Ledger
| Item | Location | Type | Risk | Effort | Priority | Status |
|---|---|---|---|---|---|---|
| Spoofable leftmost `X-Forwarded-For` + empty-string IP bypass | `src/services/httpApiGuard.ts` | Security | High | Small | P0 | Closed |
| Unbounded `SlidingWindowRateLimiter.hits` Map; `purgeStale()` unused in prod | `src/services/rateLimiter.ts` | Availability / OOM | High | Small | P0 | Closed |
| Unbounded `POST /api/advisor` JSON body & unvalidated prompt strings | `src/services/schemas.ts`, `src/services/httpApiGuard.ts` | Security / Cost | High | Medium | P0 | Closed |
| Raw `error.message` returned in HTTP 500 responses | `src/services/httpApiGuard.ts` | Info Disclosure | High | Small | P0 | Closed |
| API keys in URL query strings (`?key=`) + deprecated `gemini-2.5-flash` raw fetch | `src/services/geminiAdvisor.ts`, `src/services/providers/primaryAirQuality.ts` | Security / Deprecation | High | Medium | P0 | Closed |
| Zero timeouts / response caps / circuit breakers on 6 upstream `fetch` calls | `src/services/resilientHttp.ts`, `src/services/providers/*` | Reliability | High | Medium | P0 | Closed |
| AQI breakpoint bracket gaps (`30<c<31`, `1.0<CO<1.1`, `9.0<c<9.1`) cause non-monotonic drops | `src/engine/aqiBreakpoints.ts` | Correctness | High | Small | P1 | Closed |
| Open-Meteo timestamps parsed in host local TZ instead of UTC; `hourly[0]` used | `src/services/providers/primaryAirQuality.ts` | Correctness | High | Small | P1 | Closed |
| Weak CSP (`'unsafe-eval'`, `'unsafe-inline'`, `connect-src https:`); missing `COOP`/`CORP` | `src/services/securityHeaders.ts`, `src/middleware.ts`, `src/app/layout.tsx` | Security | Medium | Medium | P1 | Closed |
| `quantizeCoordinates(-0.001, 0)` generates `"-0.00"` split cache key | `src/services/gridCache.ts` | Correctness | Medium | Small | P1 | Closed |
| `IndoorShelterCard` ignores hydrated `initialRoomDimensions`; `localStorage` crash risk | `src/app/page.tsx`, `src/components/IndoorShelterCard.tsx`, `src/components/ErrorBoundary.tsx` | Reliability / UX | Medium | Small | P1 | Closed |
| Literal `&le;` HTML entity rendered as text; stale fetch race; uncleaned timer | `src/i18n/dictionary.ts`, `src/app/page.tsx`, `src/components/CommunityHub.tsx` | UX / Correctness | Medium | Small | P1 | Closed |
| Non-ASCII/Devanagari numerals (`०-९`) bypass `/\d/` digit guardrail | `src/services/geminiAdvisor.ts` | AI Guardrail | Medium | Small | P1 | Closed |
| `Dockerfile` installs unused `wget` and polls SSR `/` instead of `/api/health` | `Dockerfile`, `src/app/api/health/route.ts` | Operations | Low | Small | P2 | Closed |
| `vitest.config.ts` excludes services/routes from coverage; CI omits `format:check`; `README.md` drift | `vitest.config.ts`, `.github/workflows/ci.yml`, `README.md`, `PROMPTS_AND_TOOLS.md` | Hygiene | Low | Small | P2 | Closed |

## Smell Inventory
| Smell | Location | Refactoring | Status |
|---|---|---|---|
| Duplicated CPCB / US EPA piecewise interpolation & capping logic | `src/engine/aqiBreakpoints.ts` | Extract Method (`interpolateFromTable` + `resolveBracket`) | Done |
| `if / else if` ventilation mode chain | `src/engine/indoorPhysics.ts` | Replace Conditional with Lookup Table (`VENTILATION_MODE_PARAMS`) | Done |
| Duplicated IP/rate-limit/Zod/error/headers boilerplate across 3 routes | `src/app/api/*/route.ts` | Extract Deep Module (`httpApiGuard.ts` + `schemas.ts`) | Done |
| 723-line God module mixing transport, math, parsing, and orchestration | `src/services/airQualityAggregator.ts` | Decompose into `resilientHttp.ts` + `src/services/providers/*` | Done |
| Duplicated WAQI/OpenAQ skew percentage & classification logic | `src/services/providers/groundStation.ts` | Extract Method (`classifyStationSkew`) | Done |
| Array index keys on React lists | `src/app/page.tsx`, `src/components/CommunityHub.tsx` | Replace with stable IDs (`item.id`, `${actionId}-${aIdx}`) | Done |

## Sprout / Wrap Register
- None active; extracted adapters and deep modules were folded cleanly behind barrel re-exports in `src/services/index.ts` and `src/services/airQualityAggregator.ts`.

## Debt Budget & Broken-Windows Policy
- Allocate up to 15% of each feature iteration to cleaning adjacent smells or tightening characterization tests on touched modules.
- No untracked `// TODO` or silent `catch {}` blocks allowed: every exception path must either return an explicit contextual fallback or log via `redactSecrets` and return a sanitized error.
- Never lower Vitest coverage thresholds or bypass `eslint` / `prettier` / `typecheck` gates to merge a change.

## Adopted Conventions
- **Finite Input Guards**: Every exported physics/service calculation validates numeric inputs with `Number.isFinite(...)` before arithmetic.
- **Secret Hygiene**: Never place API keys or tokens in outbound URL query parameters when header auth exists (`x-goog-api-key`, `X-Goog-Api-Key`, `X-API-Key`); pass all logged strings through `redactSecrets()`.
- **Strict API Boundaries**: Every API route delegates IP extraction, bounded rate limiting, body-size limits, security headers, RED metrics, and sanitized 500 mapping to `handleGuardedApiRoute()`.
- **Explicit UTC Handling**: Normalize external date/time strings lacking timezone offsets to UTC (`normalizeUtcTimestampToIso`) before arithmetic or serialization.
