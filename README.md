# VayuShield: Deterministic Physics & Air Quality Index Kernel

**PromptWars Virtual Challenge 6** · Principal TypeScript & Environmental Systems Engineering

VayuShield is a unified, production-grade Next.js App Router and isomorphic TypeScript application providing deterministic, first-principles environmental physics and air quality index modeling. The engine in `src/engine/` is 100% pure TypeScript with zero DOM/Node dependencies, zero `process.env` reads, and zero network calls, running identically in edge runtimes, browser clients, and server environments.

---

## Architecture & Code Hygiene

- **Strict TypeScript (`tsconfig.json`):**
  - `"strict": true`
  - `"noUncheckedIndexedAccess": true`
  - `"exactOptionalPropertyTypes": true`
  - `"noImplicitReturns": true`
  - `"noImplicitAny": true`
  - Zero `any` types across the entire codebase.
- **Isomorphic Engine (`src/engine/`):** Pure deterministic mathematics and physics with zero external dependencies.
- **Verification Scripts:**
  - `npm run typecheck` — Strict type checking with `tsc --noEmit`.
  - `npm run lint` — ESLint 9 flat configuration with TypeScript and zero-any rules.
  - `npm run format:check` — Prettier code style verification.
  - `npm run test` — Vitest unit test suite (63 passing tests).
  - `npm run test:coverage` — Vitest coverage reporting with v8 (>96% branch, 99.8% statement coverage).
  - `npm run build` — Next.js production build verification.

---

## Core Engine Modules (`src/engine/`)

### 1. `aqiBreakpoints.ts` — Piecewise Linear AQI & "Satisfactory Illusion"
- **India CPCB National AQI:**
  - Exact piecewise linear sub-index interpolation for PM2.5, PM10, NO2, O3, SO2, and CO.
  - Overall AQI computed as the maximum sub-index across available pollutants.
  - Standard CPCB capping at 500, with an uncapped raw severity flag when PM2.5 > 380 µg/m³.
- **US EPA May 2024 Revised AQI:**
  - Reflects the lowered annual PM2.5 standard and updated 24-hr breakpoints effective May 6, 2024:
    - **Good (0–50):** 0.0 – 9.0 µg/m³ (tightened from 12.0 µg/m³).
    - **Moderate (51–100):** 9.1 – 35.4 µg/m³.
    - **Unhealthy for Sensitive Groups (101–150):** 35.5 – 55.4 µg/m³.
    - **Unhealthy (151–200):** 55.5 – 125.4 µg/m³.
    - **Very Unhealthy (201–300):** 125.5 – 225.4 µg/m³.
    - **Hazardous (301–500):** 225.5 – 325.4 µg/m³ and beyond.
- **`compareAqiScales(pm25: number)`:**
  - Evaluates both CPCB and US EPA scales.
  - Flags `satisfactoryIllusionAlert: true` when CPCB classifies air as "Good" or "Satisfactory" (≤ 60 µg/m³) while US EPA classifies it as "Unhealthy for Sensitive Groups" or worse (≥ 35.5 µg/m³), protecting vulnerable populations from misleading benign classifications.
  - Provides color-blind-safe semantic tokens (Tol & Okabe-Ito accessible contrast design).

### 2. `diurnalOptimizer.ts` — Diurnal Inversion & Respiratory Dose Modeling
- **Optical Sensor Hygroscopic Growth Correction:**
  - Deliquescence and water vapor condensation on aerosols at relative humidity $RH > 75\%$ inflate light scattering.
  - Corrects raw optical particle counter readings using the empirical aerosol growth factor:
    $$CF(RH) = 1 + \kappa \cdot \frac{(RH/100)^2}{1 - (RH/100)} \quad (\kappa = 0.25)$$
- **Rolling 2-Hour Exposure Windows:**
  - Analyzes a 48-hour continuous time series to identify the single cleanest window (afternoon solar convective mixing) and worst peak window (nocturnal shallow boundary layer trap) for today and tomorrow.
- **`calculateRespiratoryDose(baseline, shifted, archetype)`:**
  - Uses minute ventilation rates ($V_E$ in L/min) for standard household archetypes:
    - `child_asthma`: 12.0 L/min
    - `older_adult_walker`: 18.0 L/min
    - `office_commuter`: 20.0 L/min
    - `general_adult`: 15.0 L/min
  - Computes exact inhaled mass ($\mu\text{g}$) and percentage reduction achieved by shifting outdoor activities to the diurnal trough.

### 3. `indoorPhysics.ts` — Single-Zone Mass Balance & Combustion Clearance
- **Steady-State Infiltration Modeling:**
  - Evaluates mass balance:
    $$\frac{C_{in}}{C_{out}} = \frac{P \cdot \lambda_v}{\lambda_v + k_{dep} + \frac{\text{CADR}}{V}}$$
  - **Open windows baseline:** $\approx 91.9\%$ (~92%) infiltration ($P=0.95, \lambda_v=3.0\text{ h}^{-1}, k_{dep}=0.10\text{ h}^{-1}$).
  - **Closed windows without filter:** $\approx 81.3\%$ (~81%) infiltration ($P=0.90, \lambda_v=0.65\text{ h}^{-1}, k_{dep}=0.07\text{ h}^{-1}$).
  - **Closed windows + HEPA purifier:** Sizes required Clean Air Delivery Rate (CADR in m³/h and CFM) to achieve $\le 21\%$ outdoor infiltration or WHO Interim Targets.
- **Indoor Combustion Spike Estimator:**
  - Discrete event profiles: `unvented_frying`, `mosquito_coil`, and `incense_stick`.
  - Literature citations (e.g., Liu et al. 2003 on mosquito coil toxicity equivalent to 75–100 cigarettes).
  - Ventilation recovery times to 90% clearance calculated via exponential decay:
    $$t_{rec} = \frac{\ln(10)}{\lambda_v + k_{dep} + \frac{\text{CADR}}{V}}$$

### 4. `grapAndEmissions.ts` — Delhi-NCR GRAP & Commute Deltas
- **Commission for Air Quality Management (CAQM) GRAP Stages:**
  - Stage I ('Poor', 201–300)
  - Stage II ('Very Poor', 301–400)
  - Stage III ('Severe', 401–450)
  - Stage IV ('Severe+', >450)
  - Detailed citizen and RWA (Resident Welfare Association) checklists.
- **Commute Emission & Exposure Deltas:**
  - Modes: `private_petrol_car`, `two_wheeler`, `metro_transit`, `work_from_home`.
  - Computes CO2 emissions (g) and inhaled pulmonary PM2.5 dose ($\mu\text{g}$) per round-trip km based on mode speeds, microenvironment penetration factors, and physical exertion rates.

---

## API & Cloud Run Resilient Ingestion Layer (`src/services/`)

Ready for zero-database deployment to **Google Cloud Run (`asia-south1`)**:

1. **Coordinate Quantization & Bounded LRU/TTL Cache (`src/services/gridCache.ts`):**
   - Rounds incoming `lat` and `lon` to `0.01°` (~1.1 km grid) to prevent cache thrashing.
   - Dual-tier TTL: 30 minutes for real-time station data, 60 minutes for forecast and NASA FIRMS anomalies.
   - Sequence-tracked LRU capacity eviction and expired TTL purge.

2. **Parallel Ingestion Adapter (`src/services/airQualityAggregator.ts`):**
   - Fetches in parallel via `Promise.allSettled()`:
     - **Primary Current + 48h Forecast:** Google Maps Air Quality API with automatic failover to Open-Meteo Air Quality API (`forecast_days=3`, $\le 10$ hourly variables: `pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide`).
     - **Ground Station Skew Check:** WAQI / AQICN with OpenAQ v3 fallback. Computes `stationVsCitySkewPct` to detect micro-hotspots ($\ge +25\%$) vs. urban green buffers ($\le -25\%$).
     - **Upwind Fire Alignment:** NASA FIRMS API (`VIIRS_SNPP_NRT`) queried over $\pm 1.5^\circ$ bounding box correlated with Open-Meteo wind vectors to classify `upwind_aligned`, `crosswind`, or `none_detected`.
     - **Mandatory Attributions:** CAMS CC BY 4.0, WAQI, NASA FIRMS, Google Maps.

3. **Guarded Gemini Decision Layer (`src/services/geminiAdvisor.ts`):**
   - Input isolation: Passes strictly pre-computed engine metrics; never asks LLM to calculate numbers.
   - Output Schema: `{ topActionIds, familyBriefing, rwaNoticeHeadline, rwaNoticeBody }`.
   - **Untrusted Output Guardrail:** Strict digit-rejection regex (`/\d/`), Zod validation, and 3.5s timeout abort. Any hallucinated digit or error immediately triggers the certified deterministic fallback template in English or Hindi.

4. **Cloud Security & Rate Limiting (`src/services/rateLimiter.ts`, `src/services/securityHeaders.ts`):**
   - Sliding-window in-memory per-IP rate limiter (30 req/min/IP) returning structured HTTP 429 JSON with `Retry-After`.
   - HTTP Headers enforced via `middleware.ts`: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

5. **API Endpoints:**
   - `GET /api/air-quality?lat=28.61&lon=77.21` — Quantized multi-source intelligence payload.
   - `POST /api/advisor` — Guarded bilingual health briefing and RWA notice.

---

## Vitest Unit Test Coverage

```text
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   99.81 |    96.62 |     100 |   99.81 |                   
 aqiBreakpoints.ts |     100 |    98.11 |     100 |     100 |                   
 diurnalOptimizer.ts|   99.09 |    92.00 |     100 |   99.09 |                   
 grapAndEmissions.ts|     100 |      100 |     100 |     100 |                   
 indoorPhysics.ts  |     100 |      100 |     100 |     100 |                   
-------------------|---------|----------|---------|---------|-------------------
```
All 63 unit tests pass across all boundary edges, piecewise thresholds, and hand-worked physics derivations.
