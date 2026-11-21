# VayuShield (वायुशील्ड)

**Deterministic Physics & Air Quality Intelligence Engine for Delhi-NCR & Global Megacities**  
_PromptWars Virtual Challenge 6 · Built with Next.js 15, React 19, TypeScript 5, and Google Cloud Run (`asia-south1`)_

---

## 1. Problem-to-Feature Traceability Matrix

VayuShield directly bridges the gap between misleading static AQI bulletins and the real-world atmospheric physics of urban exposure in India.

| Real-World Air Quality Challenge                         | Atmospheric & Biological Mechanism                                                                                                                                                                                                                                                           | VayuShield Solution & Engine Logic                                                                                                                                                                                                                                                                                        | Source Implementation Files                                                                                                                                                                                                                                                        | UI Component                                                                                                                  |
| :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **"Satisfactory Illusion" (CPCB vs. US EPA Divergence)** | CPCB classifies $\text{PM}_{2.5}$ up to $60\ \mu\text{g/m}^3$ as "Satisfactory", whereas the revised May 2024 US EPA standard classifies anything $>35.5\ \mu\text{g/m}^3$ as "Unhealthy for Sensitive Groups" (USG) or worse, creating a false sense of safety.                             | Piecewise linear dual-scale interpolation. Evaluates both CPCB National AQI and US EPA 2024 revised standards. Flags `satisfactoryIllusionAlert: true` with high-contrast, color-blind-safe warnings.                                                                                                                     | [`src/engine/aqiBreakpoints.ts`](file:///e:/ai%20projects/h2skill/challenge%206/src/engine/aqiBreakpoints.ts) (`compareAqiScales`, `calculateCpcbAqi`, `calculateUsEpaAqi`)                                                                                                        | [`src/components/DualScaleCard.tsx`](file:///e:/ai%20projects/h2skill/challenge%206/src/components/DualScaleCard.tsx)         |
| **Diurnal Smog Trapping & Exercise Hazard**              | Nocturnal ground cooling creates shallow nocturnal boundary layer inversions trapping vehicular and biomass emissions. Morning exercise during peak smog causes massive pulmonary deposition. Solar convective mixing in afternoons dilutes aerosols.                                        | 48-hour continuous rolling 2-hour exposure window analysis. Hygroscopic optical sensor growth correction factor applied when $RH > 75\%$. Physiological minute ventilation respiratory dose ($\mu\text{g}$ inhaled) computed for 4 archetypes (`child_asthma`, `older_adult_walker`, `office_commuter`, `general_adult`). | [`src/engine/diurnalOptimizer.ts`](file:///e:/ai%20projects/h2skill/challenge%206/src/engine/diurnalOptimizer.ts) (`computeRollingDiurnalWindows`, `calculateRespiratoryDose`)                                                                                                     | [`src/components/DiurnalPlanner.tsx`](file:///e:/ai%20projects/h2skill/challenge%206/src/components/DiurnalPlanner.tsx)       |
| **Indoor Infiltration & Combustion Spikes**              | Closed windows without filtration still permit $\sim 81\%$ outdoor $\text{PM}_{2.5}$ penetration ($\sim 92\%$ open). Everyday indoor cultural combustion (agarbatti/incense, mosquito coils, unvented frying) creates extreme localized particulate spikes exceeding $500\ \mu\text{g/m}^3$. | Steady-state single-zone mass balance model ($\frac{dC_{in}}{dt}$). Dynamic Clean Air Delivery Rate (CADR in $\text{m}^3/\text{h}$ and CFM) sizing for room volumes. Exponential decay clearance time estimation ($t_{rec}$ to 90% clearance).                                                                            | [`src/engine/indoorPhysics.ts`](file:///e:/ai%20projects/h2skill/challenge%206/src/engine/indoorPhysics.ts) (`calculateIndoorSteadyState`, `calculatePurifierRequirement`, `calculateCombustionClearance`)                                                                         | [`src/components/IndoorShelterCard.tsx`](file:///e:/ai%20projects/h2skill/challenge%206/src/components/IndoorShelterCard.tsx) |
| **Upwind Stubble Burning vs. Local Trapping**            | Long-range transboundary agricultural stubble burning (Punjab/Haryana) vs. local vehicular/industrial stagnation are frequently conflated, resulting in misallocated mitigation efforts.                                                                                                     | NASA FIRMS VIIRS active fire anomaly ingestion ($\pm 1.5^\circ$ bounding box). Correlates fire locations and distances with Open-Meteo wind vectors and boundary layer height to classify upwind alignment (`upwind_aligned`, `crosswind`, `none_detected`).                                                              | [`src/services/airQualityAggregator.ts`](file:///e:/ai%20projects/h2skill/challenge%206/src/services/airQualityAggregator.ts) (`fetchFirmsHotspots`, `determineFireAlignment`)                                                                                                     | [`src/components/UpwindContextCard.tsx`](file:///e:/ai%20projects/h2skill/challenge%206/src/components/UpwindContextCard.tsx) |
| **Community Stagnation & Delayed GRAP Action**           | Delhi-NCR CAQM Graded Response Action Plan (GRAP Stages I–IV) citizen mandates are rarely communicated effectively to RWAs and schools, and vehicular tailpipe/brake emissions remain unquantified.                                                                                          | Automated GRAP stage evaluation (Stages I–IV) matching AQI thresholds. Vehicular tailpipe and non-exhaust PM emission calculations by vehicle type/fuel. One-click bilingual RWA / School WhatsApp advisory generator.                                                                                                    | [`src/engine/grapAndEmissions.ts`](file:///e:/ai%20projects/h2skill/challenge%206/src/engine/grapAndEmissions.ts) (`evaluateGrapStage`, `calculateCommuteImpact`), [`src/services/geminiAdvisor.ts`](file:///e:/ai%20projects/h2skill/challenge%206/src/services/geminiAdvisor.ts) | [`src/components/CommunityHub.tsx`](file:///e:/ai%20projects/h2skill/challenge%206/src/components/CommunityHub.tsx)           |

---

## 2. Split-Brain Architecture Overview

VayuShield enforces a strict separation between **deterministic mathematical physics** and **generative language synthesis**. Generative AI models are fundamentally prone to arithmetic hallucinations, piecewise threshold miscalculations, and floating-point errors. VayuShield completely eliminates this risk through its **Split-Brain Architecture**.

```mermaid
flowchart TD
    subgraph Client ["Client Browser (Zero-Latency Local Computation)"]
        UI["Accessible Bilingual UI (React 19)"]
        LocalEngine["Local Engine (src/engine/)"]
        LocalStorage[("Household Profile Storage")]
        UI <--> LocalStorage
        UI -->|Instant Slider Toggles| LocalEngine
        LocalEngine -->|0ms Math Update| UI
    end

    subgraph Backend ["Serverless API (Google Cloud Run asia-south1)"]
        API["API Route /api/intelligence"]
        GridCache[("0.01° Grid Cache (TTL 30m / 60m)")]
        RateLimiter["Sliding-Window Rate Limiter (30 req/min)"]
        Aggregator["Parallel Aggregator (Promise.allSettled)"]

        API --> RateLimiter
        RateLimiter --> GridCache
        GridCache -->|Cache Miss| Aggregator

        subgraph Upstream ["Upstream Environmental Providers"]
            GMaps["Google Maps Air Quality API"]
            OpenMeteo["Open-Meteo AQ & Weather (CAMS CC BY 4.0)"]
            WAQI["WAQI / CPCB Ground Stations"]
            FIRMS["NASA FIRMS VIIRS Active Fires"]
        end

        Aggregator --> GMaps
        Aggregator --> OpenMeteo
        Aggregator --> WAQI
        Aggregator --> FIRMS

        ServerEngine["Server Engine (src/engine/)"]
        Aggregator --> ServerEngine

        subgraph GuardedLLM ["Guarded AI Layer"]
            Gemini["Gemini 2.5 Flash API (Structured JSON Schema)"]
            Guardrail{"Digit Rejection & Validation Check (/\d/)"}
            DeterministicFallback["Deterministic Bilingual Templates (src/i18n/)"]

            ServerEngine -->|Pre-Computed Numbers Only| Gemini
            Gemini --> Guardrail
            Guardrail -->|Contains Hallucinated Digits or Timeout > 3.5s| DeterministicFallback
            Guardrail -->|Clean Qualitative Text| Payload["Verified Intelligence Payload"]
            DeterministicFallback --> Payload
        end
    end

    UI <-->|Quantized Fetch (lat/lon 0.01°)| API
```

### Why `src/engine/` Handles 100% of Mathematics

- **Isomorphic Purity:** All files in `src/engine/` are 100% pure TypeScript. They contain zero network requests, zero `process.env` calls, and zero DOM/Node dependencies.
- **Client & Server Equivalence:** The identical mathematical engine runs inside the Next.js API route to format server responses and inside the user's browser for instantaneous, zero-network slider recalculations.
- **Untrusted Output Guardrail:** The Gemini decision layer (`src/services/geminiAdvisor.ts`) receives strictly pre-computed numbers as read-only context. It is constrained to structured JSON output with an adversarial digit-rejection guardrail: if Gemini outputs any unverified numeric digits (`/\d/`) in qualitative fields or fails to respond within 3.5 seconds, the system instantly discards the LLM output and serves a deterministic fallback template from `src/i18n/dictionary.ts`.

---

## 3. Local Setup, Testing & Verification Commands

### Prerequisites

- Node.js 22.x LTS
- npm 10.x+

### 1. Installation

```bash
# Clone the repository and install locked dependencies
npm ci
```

### 2. Verification Scripts

Every script enforces zero errors and passes strict CI criteria:

```bash
# Strict TypeScript compilation (strict: true, noUncheckedIndexedAccess: true)
npm run typecheck

# Static code quality and hygiene (ESLint 9 flat config)
npm run lint

# Prettier format check
npm run format:check

# Run 112 Vitest unit and integration tests
npm run test

# Run Vitest test coverage report with v8 (enforcing >96% branch and >99% statement coverage)
npm run test:coverage

# Run Playwright E2E and axe-core accessibility suite (Chromium, 0 violations)
npm run test:e2e

# Build production Next.js standalone bundle
npm run build
```

### 3. Local Development Server

```bash
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 4. Google Cloud Run (`asia-south1`) Deployment Guide

VayuShield is architected for zero-database, serverless deployment on Google Cloud Run in the `asia-south1` (Mumbai) region for sub-50ms latency across India.

### Step 1: Configure Google Cloud Secret Manager

Store all upstream API credentials in Google Cloud Secret Manager to prevent client-side credential exposure:

```bash
# Enable required Google Cloud services
gcloud services enable run.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com

# Create secrets in Secret Manager
echo -n "your_google_maps_key" | gcloud secrets create GOOGLE_MAPS_API_KEY --data-file=-
echo -n "your_gemini_api_key" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "your_waqi_token" | gcloud secrets create WAQI_TOKEN --data-file=-
echo -n "your_nasa_firms_key" | gcloud secrets create NASA_FIRMS_MAP_KEY --data-file=-
echo -n "your_openaq_key" | gcloud secrets create OPENAQ_API_KEY --data-file=-
```

### Step 2: Build Multi-Stage Container Image via Cloud Build

```bash
export PROJECT_ID=$(gcloud config get-value project)

# Submit build to Google Cloud Build using the multi-stage Dockerfile
gcloud builds submit --tag asia-south1-docker.pkg.dev/$PROJECT_ID/vayushield/app:latest .
```

### Step 3: Deploy to Cloud Run with Secret Ingestion

```bash
gcloud run deploy vayushield \
  --image asia-south1-docker.pkg.dev/$PROJECT_ID/vayushield/app:latest \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-secrets="GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,WAQI_TOKEN=WAQI_TOKEN:latest,NASA_FIRMS_MAP_KEY=NASA_FIRMS_MAP_KEY:latest,OPENAQ_API_KEY=OPENAQ_API_KEY:latest"
```

### Step 4: Verify Production Healthcheck

The container runs as an unprivileged `nextjs:nodejs` user and exposes port `8080` with a native Node.js HTTP healthcheck:

```bash
# Verify the deployed service
curl -I https://vayushield-[your-hash]-el.a.run.app/
# Expect: HTTP/2 200 OK (< 300ms response time)
```

---

## 5. Data Sources & Licensing Attributions

VayuShield integrates multiple scientific and regulatory data streams in compliance with their open data and API policies:

1. **Google Maps Platform Air Quality API:**
   - Provides primary current conditions and 48-hour continuous hourly forecasts.
   - Attributed pursuant to the Google Maps Platform Terms of Service.
2. **Open-Meteo Air Quality & Weather APIs (Copernicus CAMS):**
   - European Centre for Medium-Range Weather Forecasts (ECMWF) Copernicus Atmosphere Monitoring Service (CAMS).
   - Weather and atmospheric boundary layer height data from Open-Meteo.
   - **Licensing:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
3. **World Air Quality Index Project (WAQI / AQICN):**
   - Ground monitoring station readings and EPA/CPCB reporting station skew comparisons.
   - Originating data courtesy of the Central Pollution Control Board (CPCB), Delhi Pollution Control Committee (DPCC), and state pollution boards.
4. **OpenAQ Community Platform:**
   - Universal open air quality data platform used for ground monitor fallback.
   - **Licensing:** Open Data Commons Attribution License (ODC-By).
5. **NASA FIRMS (Fire Information for Resource Management System):**
   - Active fire hotspot detections from the VIIRS (Visible Infrared Imaging Radiometer Suite) instrument on the Suomi NPP satellite (`VIIRS_SNPP_NRT`).
   - Courtesy of NASA Earth Science Data and Information System (ESDIS) Project.

---

## 6. Verification & Automated Quality Gates

All automated checks are enforced locally and in the GitHub Actions pipeline ([`.github/workflows/ci.yml`](file:///e:/ai%20projects/h2skill/challenge%206/.github/workflows/ci.yml)):

```text
================================================================================
 QUALITY GATE                           METRIC / STATUS                RESULT
================================================================================
 TypeScript Strictness                  0 Errors (strict: true)        PASS
 ESLint Static Hygiene                  0 Errors / 0 Warnings          PASS
 Vitest Unit & Integration Suites       112 / 112 Tests Passing        PASS
 Vitest Statement Coverage              99.81% (v8 engine)             PASS
 Vitest Branch Coverage                 96.89% (v8 engine)             PASS
 Playwright E2E Scenarios (A & B)       2 / 2 Passing (14.7s)          PASS
 axe-core Accessibility Violations      0 Violations (WCAG AA/AAA)     PASS
 High/Critical Dependency Audit         0 Vulnerabilities              PASS
 Secret Leak Prevention Check           0 High-entropy Keys Detected   PASS
 Standalone Docker Cold-Start Latency   253 ms on Port 8080            PASS
================================================================================
```
