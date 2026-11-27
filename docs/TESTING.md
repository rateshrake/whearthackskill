# Testing

## Test Strategy
- **Unit & Kernel Physics (`vitest`)**: Pure deterministic tests for `src/engine/*` verifying piecewise interpolation, inter-bracket monotonicity, hygroscopic corrections, mass balance, combustion decay, GRAP stages, and commute exposure deltas.
- **Service & API Boundary Tests (`vitest`)**: Mocked-HTTP and injected-port tests covering caching, bounded rate limiting, trusted rightmost IP parsing, Zod schema bounds, 413 body limits, sanitized 500 responses, circuit breakers, timeouts, `/api/health`, and Gemini Interactions guardrails.
- **Component Rendering Tests (`vitest`)**: Server-side `renderToString` and boundary checks for component props, `ErrorBoundary`, and `&le;` entity rendering fix.
- **End-to-End & Accessibility (`playwright` + `@axe-core/playwright`)**: Full browser flows against Next.js production server (`CI=true`) verifying zero `pageerror`s, strict CSP compatibility, zero-latency slider updates, and zero WCAG violations.
- **Green Gate**: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test:coverage` (131/131 tests; 94.15% statements / 82.21% branches / 97.11% functions), `npm run build`, and `npm run test:e2e`.

## Safety Net Map
| Module | Pinned behaviors | Test files | Gaps |
|---|---|---|---|
| `src/engine/aqiBreakpoints.ts` | CPCB 6-pollutant brackets, US EPA 2024 brackets, gap monotonicity (`30.1`, `60.1`, `1.01` CO, `9.04` EPA), `Infinity`/`NaN` guards | `src/engine/__tests__/aqiBreakpoints.test.ts` | None |
| `src/engine/diurnalOptimizer.ts` | Hygroscopic RH > 75% correction, chronological sorting, invalid date filtering, rolling 2h windows, 4 archetypes dose math | `src/engine/__tests__/diurnalOptimizer.test.ts` | None |
| `src/engine/indoorPhysics.ts` | Room volume & finite guards, 3 ventilation regimes, CADR sizing, combustion spike decay | `src/engine/__tests__/indoorPhysics.test.ts` | None |
| `src/engine/grapAndEmissions.ts` | GRAP stages 0–IV, finite guards, commute CO2 & inhaled PM2.5 deltas | `src/engine/__tests__/grapAndEmissions.test.ts` | None |
| `src/services/gridCache.ts` | 0.01° quantization, `-0` normalization, coordinate bounds, TTL expiry, LRU eviction, purge/clear | `src/services/__tests__/gridCache.test.ts` | None |
| `src/services/rateLimiter.ts` | Sliding-window allow/deny, `maxEntries` LRU eviction, automatic `purgeStale()`, empty IP normalization | `src/services/__tests__/rateLimiter.test.ts` | None |
| `src/services/airQualityAggregator.ts` & `providers/*` | Parallel ingestion, single-flight coalescing, Google `X-Goog-Api-Key`, Open-Meteo UTC normalization, WAQI/OpenAQ skew, FIRMS alignment | `src/services/__tests__/airQualityAggregator.test.ts` | Live network timeouts/breakers rely on mocked `fetch` |
| `src/services/geminiAdvisor.ts` | `@google/genai` Interactions (`gemini-4-hydrogen`) header auth, ASCII & Devanagari digit rejection, timeout abort, circuit breaker, Zod/JSON fallbacks | `src/services/__tests__/geminiAdvisor.test.ts` | Live Gemini API response depends on external key |
| `src/app/api/*`, `httpApiGuard.ts`, `resilientHttp.ts` | `/api/air-quality`, `/api/advisor`, `/api/intelligence`, `/api/health`, rightmost XFF, 413 body cap, sanitized 500 | `src/services/__tests__/apiRoutes.test.ts` | Real Cloud Run GFE XFF appending (`needs_validation`) |
| `src/middleware.ts` & `securityHeaders.ts` | Per-request CSP nonce, `COOP`, `CORP`, `no-store` API headers | `src/services/__tests__/apiRoutes.test.ts`, `e2e/app.spec.ts` | None |
| `src/components/*` & `src/app/page.tsx` | SSR markup, `ErrorBoundary`, `≤ 21%` fix, Playwright Scenario A/B + Axe + `pageerror` | `src/components/__tests__/components.test.tsx`, `e2e/app.spec.ts` | Client `AbortController` race tested via static review & E2E |

## Characterization Backlog
- [x] Initial baseline identified from source inspection (2026-11-27)
- [x] Pin `/api/intelligence`, `/api/advisor` oversized/sanitized inputs, and 500 error redaction (Phase 1)
- [x] Pin `rateLimiter` memory bounds & trusted rightmost XFF behavior (Phase 1)
- [x] Pin `gridCache` `-0` and coordinate validation behavior (Phase 1)
- [x] Pin `airQualityAggregator` UTC timestamp, current-hour, timeout, and CSV edge cases (Phase 1)
- [x] Pin `engine/*` non-finite and inter-bracket edge cases (Phase 1)
- [x] Pin component `ErrorBoundary` and `≤` entity fix (Phase 1)

## CI Gates
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`
- `npm run test:coverage` (covers `src/engine/**/*.ts`, `src/services/**/*.ts`, `src/app/api/**/*.ts`)
- `npm run build`
- `npm run test:e2e` (runs against production `npm run start` in CI)
- `npm audit --audit-level=high`
