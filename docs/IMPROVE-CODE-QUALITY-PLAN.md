# Improve Code Quality Plan

## Context
- **Date Started**: 2026-11-27
- **Product & Risk**: VayuShield — Next.js 15 / React 19 / TypeScript 5.7 urban air quality intelligence platform for Delhi-NCR & Indian cities combining deterministic atmospheric physics (`src/engine/`), multi-provider environmental aggregation (`src/services/`), and an AI briefing advisor (`geminiAdvisor.ts`). Breaking physics misleads health exposure advice; breaking API trust boundaries allows rate-limit bypass, unbounded Gemini/Google Maps spend, stale cache/TZ drift, or CSP weaknesses.
- **Stack**: Next.js 15.5.29 (App Router, standalone Docker on Cloud Run `asia-south1`), React 19, TypeScript 5.7 (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Zod 4, `@google/genai` 3.6.1, Tailwind CSS 3.4, Vitest 3.0.5, Playwright 1.65.1 + `@axe-core/playwright`. Zero database / zero ORM.
- **Deployment & Scale**: Single/low-traffic stateless Cloud Run service behind Google Front End (GFE) reverse proxy; in-memory bounded rate limiter and `0.01°` grid LRU caches.
- **Outbound Dependencies**: Google Maps Air Quality API, Open-Meteo Air Quality & Weather APIs, WAQI / AQICN, OpenAQ v3, NASA FIRMS (`VIIRS_SNPP_NRT`), Google Gemini API (`gemini-4-hydrogen`).
- **Starting Modules (Three-Axis Heuristic)**: API routes (`src/app/api/*`), `src/services/airQualityAggregator.ts`, `src/services/rateLimiter.ts`, `src/services/geminiAdvisor.ts`, and core physics kernel (`src/engine/*`).

## Phase Status
| Phase | Skill | Status | Artifact | Date |
|---|---|---|---|---|
| 1 — Build the safety net | working-with-legacy-code | done | TESTING.md + TECH-DEBT.md (GATE) | 2026-11-27 |
| 2 — Make the code readable | clean-code | done | TECH-DEBT.md | 2026-11-27 |
| 3 — Apply named refactorings | refactoring-patterns | done | TECH-DEBT.md | 2026-11-27 |
| 4 — Reduce complexity | software-design-philosophy | done | TECH-DEBT.md | 2026-11-27 |
| 5 — Draw the architecture boundary | clean-architecture | done | ARCHITECTURE.md | 2026-11-27 |
| 6 — Lock in the habits | pragmatic-programmer | done | TECH-DEBT.md | 2026-11-27 |
| 7 — Make it survive production | release-it | done | RELIABILITY.md | 2026-11-27 |
| 8 — Size for real load | system-design | skipped: Single/low-traffic Cloud Run profile; bounded in-memory caches and rate limiter suffice without Redis/replicas | ARCHITECTURE.md + RELIABILITY.md | 2026-11-27 |
| 9 — Get the data layer right | ddia-systems | skipped: Stateless zero-database architecture with no persistent store or concurrent writes | ARCHITECTURE.md | 2026-11-27 |
| Optional — Domain language | domain-driven-design | skipped: Domain physics and regulatory vocabulary already isolated in `src/engine/` | ARCHITECTURE.md | 2026-11-27 |
Statuses: pending · in-progress · awaiting-evidence · done · deferred: <reason> · skipped: <reason>

## Key Decisions
| Date | Phase | Decision | Rationale |
|---|---|---|---|
| 2026-11-27 | Intake | Target Phases 1–7 + security remediation; skip Phases 8–9 | Single/low-traffic stateless Cloud Run profile confirmed by user; avoids premature Redis/DB infrastructure. |
| 2026-11-27 | Intake | Parse `X-Forwarded-For` from right with `TRUSTED_PROXY_HOPS=1` default | Prevents client-supplied leftmost `XFF` IP spoofing against rate limiter on Cloud Run. |
| 2026-11-27 | Intake | Enforce strict `CpcbCategory` / `UsEpaCategory` enums & length caps on `POST /api/advisor` | Blocks prompt injection and oversized payloads on public advisor endpoint. |
| 2026-11-27 | Intake | Migrate `geminiAdvisor.ts` to `@google/genai` Interactions API (`gemini-4-hydrogen`) | Replaces deprecated `gemini-2.5-flash` and removes `?key=` from URL query strings. |
| 2026-11-27 | Intake | Enable per-request nonce CSP + dynamic SSR in `layout.tsx` and scoped UI bug fixes | Removes `'unsafe-eval'`/`'unsafe-inline'` from `script-src` while preserving working UI and fixing functional bugs. |

## Next Actions
- [x] Pin characterization tests across `/api/intelligence`, rateLimiter, gridCache, airQualityAggregator, engine edge cases, and components (Phase 1 GATE)
- [x] Fix engine monotonicity / finite-number guards, `-0` cache key, and Open-Meteo UTC TZ bug (Phase 2)
- [x] Extract `httpApiGuard`, `resilientHttp`, `observability`, and `src/services/providers/*` (Phases 3–5)
- [x] Migrate `geminiAdvisor.ts` to `@google/genai` Interactions API (`gemini-4-hydrogen`) (Phase 5)
- [x] Harden CSP nonces, `/api/health`, `Dockerfile`, CI gates, and scoped UI fixes (Phases 6–7)
- [ ] Validate `TRUSTED_PROXY_HOPS` and live Cloud Run response headers on next production deployment (Owner)
