import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  aggregateAirIntelligence,
  fetchPrimaryAirQuality,
  fetchGroundStationData,
  fetchUpwindFireContext,
  calculateHaversineDistanceKm,
  calculateBearingDegrees,
  calculateAngleDifference,
  MANDATORY_ATTRIBUTIONS,
} from "../airQualityAggregator";
import { globalStationCache, globalForecastCache, globalFirmsCache } from "../gridCache";
import { resetAllCircuitBreakers, redactSecrets } from "../resilientHttp";
import { normalizeUtcTimestampToIso } from "../providers/primaryAirQuality";

describe("Service 3: airQualityAggregator", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    globalStationCache.clear();
    globalForecastCache.clear();
    globalFirmsCache.clear();
    resetAllCircuitBreakers();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Geodesic Math & Upwind Bearing Calculations", () => {
    it("should calculate Haversine distance accurately", () => {
      // Distance between Connaught Place (28.63, 77.22) and India Gate (28.61, 77.23) ~ 2.4 km
      const dist = calculateHaversineDistanceKm(28.63, 77.22, 28.61, 77.23);
      expect(dist).toBeGreaterThan(2.0);
      expect(dist).toBeLessThan(3.0);
    });

    it("should calculate compass bearing and angular differences", () => {
      // Due North: from (0, 0) to (1, 0) -> 0 deg
      const north = calculateBearingDegrees(0, 0, 1, 0);
      expect(north).toBe(0);

      // Due East: from (0, 0) to (0, 1) -> 90 deg
      const east = calculateBearingDegrees(0, 0, 0, 1);
      expect(east).toBe(90);

      // Angle difference
      expect(calculateAngleDifference(350, 10)).toBe(20);
      expect(calculateAngleDifference(45, 225)).toBe(180);
      expect(calculateAngleDifference(180, 180)).toBe(0);
    });
  });

  describe("Primary Air Quality Fetch & Open-Meteo Failover", () => {
    it("should failover seamlessly to Open-Meteo when Google Maps API returns 429/500", async () => {
      process.env.GOOGLE_MAPS_API_KEY = "mock_google_key";

      // Mock fetch: Google Maps returns 429, Open-Meteo succeeds
      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("airquality.googleapis.com")) {
          return Promise.resolve(new Response("Rate limit exceeded", { status: 429 }));
        }

        if (urlStr.includes("air-quality-api.open-meteo.com")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                hourly: {
                  time: ["2026-11-20T00:00", "2026-11-20T01:00"],
                  pm2_5: [110.5, 125.0],
                  pm10: [200.0, 220.0],
                  nitrogen_dioxide: [45.0, 50.0],
                  ozone: [30.0, 28.0],
                  sulphur_dioxide: [15.0, 16.0],
                  carbon_monoxide: [850.0, 900.0],
                },
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }

        return Promise.resolve(new Response("Not found", { status: 404 }));
      });

      const result = await fetchPrimaryAirQuality(28.61, 77.21);

      expect(result.source).toBe("open_meteo");
      expect(result.current.pm25).toBe(110.5);
      expect(result.current.pm10).toBe(200.0);
      expect(result.current.co).toBe(0.85); // 850 / 1000 mg/m³
      expect(result.forecastObservations.length).toBeGreaterThan(0);
    });

    it("should parse Google Maps API when key exists and response is successful", async () => {
      process.env.GOOGLE_MAPS_API_KEY = "valid_key";

      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("airquality.googleapis.com")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                pollutants: [
                  { code: "pm25", concentration: { value: 145.0 } },
                  { code: "pm10", concentration: { value: 260.0 } },
                  { code: "no2", concentration: { value: 55.0 } },
                  { code: "o3", concentration: { value: 40.0 } },
                  { code: "so2", concentration: { value: 18.0 } },
                  { code: "co", concentration: { value: 1.8 } },
                ],
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }
        return Promise.resolve(new Response("Not found", { status: 404 }));
      });

      const result = await fetchPrimaryAirQuality(28.61, 77.21);
      expect(result.source).toBe("google_maps");
      expect(result.current.pm25).toBe(145.0);
      expect(result.forecastObservations).toHaveLength(48);
    });
  });

  describe("Ground Station Skew Check & Micro-Hotspots", () => {
    it("should compute stationVsCitySkewPct and detect microHotspotAlert (>= +25%)", async () => {
      process.env.WAQI_TOKEN = "mock_waqi_token";

      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("api.waqi.info")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                status: "ok",
                data: {
                  aqi: 385,
                  city: { name: "Anand Vihar, Delhi" },
                  attributions: [{ name: "Delhi Pollution Control Committee (DPCC)" }],
                  iaqi: { pm25: { v: 160.0 } }, // Station = 160 vs City = 100 -> +60% skew
                },
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }
        return Promise.resolve(new Response("Not found", { status: 404 }));
      });

      const station = await fetchGroundStationData(28.65, 77.31, 100.0);

      expect(station).not.toBeNull();
      expect(station?.stationName).toBe("Anand Vihar, Delhi");
      expect(station?.stationVsCitySkewPct).toBe(60.0);
      expect(station?.classification).toBe("micro_hotspot");
      expect(station?.attribution).toContain("WAQI");
    });

    it("should detect background buffer sanctuary when station is <= -25%", async () => {
      process.env.WAQI_TOKEN = "mock_waqi_token";

      globalThis.fetch = vi.fn().mockImplementation((_url: string | URL | Request) => {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              status: "ok",
              data: {
                aqi: 95,
                city: { name: "Nehru Park Sanctuary" },
                attributions: [{ name: "CPCB" }],
                iaqi: { pm25: { v: 60.0 } }, // Station = 60 vs City = 100 -> -40%
              },
            }),
            { status: 200 },
          ),
        );
      });

      const station = await fetchGroundStationData(28.59, 77.19, 100.0);
      expect(station?.classification).toBe("background_buffer");
      expect(station?.stationVsCitySkewPct).toBe(-40.0);
    });
  });

  describe("NASA FIRMS & Upwind Fire Alignment", () => {
    it("should classify upwind_aligned when fires lie upwind along wind bearing", async () => {
      process.env.NASA_FIRMS_MAP_KEY = "mock_firms_key";

      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = url.toString();
        // 1. Open-Meteo wind query: NW wind (315°) at 15 km/h
        if (urlStr.includes("api.open-meteo.com/v1/forecast")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                current: {
                  wind_speed_10m: 15.0,
                  wind_direction_10m: 315.0, // Blowing FROM North-West (Punjab/Haryana)
                },
              }),
              { status: 200 },
            ),
          );
        }

        // 2. NASA FIRMS CSV query: Fire located to the North-West of Delhi (e.g. 29.5, 76.2)
        if (urlStr.includes("firms.modaps.eosdis.nasa.gov")) {
          const csv =
            "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,version,bright_ti5,frp,daynight\n" +
            "29.5,76.2,345.2,0.4,0.4,2026-11-20,0830,N,nominal,2.0NRT,298.5,12.5,D\n" +
            "29.6,76.1,350.1,0.4,0.4,2026-11-20,0830,N,nominal,2.0NRT,301.2,18.2,D\n";
          return Promise.resolve(new Response(csv, { status: 200 }));
        }

        return Promise.resolve(new Response("Not found", { status: 404 }));
      });

      // Delhi coordinates: 28.61, 77.21
      const fireContext = await fetchUpwindFireContext(28.61, 77.21);

      expect(fireContext.fireHotspotCount).toBe(2);
      expect(fireContext.nearestFireKm).not.toBeNull();
      expect(fireContext.alignment).toBe("upwind_aligned");
      expect(fireContext.scientificDisclaimer).toContain(
        "without implying single-source deterministic causation",
      );
      expect(fireContext.attribution).toBe(MANDATORY_ATTRIBUTIONS.NASA_FIRMS);
    });

    it("should classify none_detected when no fires are present", async () => {
      process.env.NASA_FIRMS_MAP_KEY = "mock_firms_key";

      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("api.open-meteo.com/v1/forecast")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ current: { wind_speed_10m: 10, wind_direction_10m: 90 } }),
              { status: 200 },
            ),
          );
        }
        if (urlStr.includes("firms.modaps.eosdis.nasa.gov")) {
          return Promise.resolve(new Response("latitude,longitude\n", { status: 200 }));
        }
        return Promise.resolve(new Response("Not found", { status: 404 }));
      });

      const context = await fetchUpwindFireContext(28.61, 77.21);
      expect(context.fireHotspotCount).toBe(0);
      expect(context.alignment).toBe("none_detected");
    });
  });

  describe("aggregateAirIntelligence Unified Resilience & Caching", () => {
    it("should coordinate all sources, compute engine metrics, and cache on 0.01° grid", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("air-quality-api.open-meteo.com")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                hourly: {
                  time: ["2026-11-20T00:00", "2026-11-20T01:00"],
                  pm2_5: [92.0, 115.0],
                  pm10: [180.0, 195.0],
                  nitrogen_dioxide: [40.0, 42.0],
                  ozone: [35.0, 32.0],
                  sulphur_dioxide: [12.0, 14.0],
                  carbon_monoxide: [800.0, 850.0],
                },
              }),
              { status: 200 },
            ),
          );
        }
        if (urlStr.includes("api.open-meteo.com/v1/forecast")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                current: { wind_speed_10m: 10, wind_direction_10m: 300 },
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(new Response("Not found", { status: 404 }));
      });

      // Query with high-precision coordinates
      const p1 = await aggregateAirIntelligence(28.61394, 77.20902);
      expect(p1.quantizedCoordinates.lat).toBe(28.61);
      expect(p1.quantizedCoordinates.lon).toBe(77.21);
      expect(p1.provenance.isCacheHit).toBe(false);
      expect(p1.currentConditions.cpcb.category).toBe("Poor"); // 92 µg/m³ is Poor (201-300)
      expect(p1.mandatoryAttributions).toContain(MANDATORY_ATTRIBUTIONS.OPEN_METEO_CAMS);

      // Query with slightly offset coordinates rounding to identical 0.01 grid -> CACHE HIT!
      const p2 = await aggregateAirIntelligence(28.6142, 77.2088);
      expect(p2.quantizedCoordinates.lat).toBe(28.61);
      expect(p2.quantizedCoordinates.lon).toBe(77.21);
      expect(p2.provenance.isCacheHit).toBe(true);
    });

    it("should classify crosswind fire alignment and handle OpenAQ fallback & full outage resilience", async () => {
      process.env.NASA_FIRMS_MAP_KEY = "mock_firms_key";
      process.env.OPENAQ_API_KEY = "mock_openaq_key";

      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("api.open-meteo.com/v1/forecast")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                current: { wind_speed_10m: 15, wind_direction_10m: 90 }, // East wind
              }),
              { status: 200 },
            ),
          );
        }
        if (urlStr.includes("firms.modaps.eosdis.nasa.gov")) {
          // Fire due North of Delhi -> 90 deg difference from East wind -> crosswind
          const csv = "latitude,longitude,bright_ti4\n29.6,77.21,330.0\n";
          return Promise.resolve(new Response(csv, { status: 200 }));
        }
        if (urlStr.includes("api.openaq.org/v3/locations")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                results: [
                  {
                    name: "OpenAQ Test Station",
                    owner: { name: "Community Sensor" },
                    sensors: [{ parameter: { name: "pm25" }, value: 110 }],
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(new Response("Not found", { status: 404 }));
      });

      const fireContext = await fetchUpwindFireContext(28.61, 77.21);
      expect(fireContext.alignment).toBe("crosswind");

      const station = await fetchGroundStationData(28.61, 77.21, 100);
      expect(station?.stationName).toBe("OpenAQ Test Station");
      expect(station?.attribution).toContain("OpenAQ");

      // Total upstream failure still returns resilient 48h deterministic fallback payload
      globalForecastCache.clear();
      globalFirmsCache.clear();
      globalStationCache.clear();
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network down"));
      const fallback = await aggregateAirIntelligence(28.61, 77.21);
      expect(fallback.currentConditions.pm25).toBeGreaterThan(0);
      expect(fallback.diurnalAnalysis.observations48h).toHaveLength(48);
      expect(fallback.diurnalAnalysis.cleanestToday).not.toBeNull();
      expect(fallback.diurnalAnalysis.worstToday).not.toBeNull();
      expect(fallback.diurnalAnalysis.cleanestTomorrow).not.toBeNull();
      expect(fallback.diurnalAnalysis.worstTomorrow).not.toBeNull();

      // Synthetic primary-outage fallback must NOT be cached for 60 minutes
      const fallbackRetry = await aggregateAirIntelligence(28.61, 77.21);
      expect(fallbackRetry.provenance.isCacheHit).toBe(false);
    });

    it("should merge real Open-Meteo relative_humidity_2m, keep multi-pollutant CPCB consistent in scale comparison, and handle OpenAQ /latest + invalid loc.id", async () => {
      process.env.OPENAQ_API_KEY = "mock_openaq_key";

      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("air-quality-api.open-meteo.com")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                current: {
                  pm2_5: 51.1,
                  pm10: 125.0,
                  nitrogen_dioxide: 30.0,
                  ozone: 20.0,
                  sulphur_dioxide: 10.0,
                  carbon_monoxide: 600.0,
                },
                hourly: {
                  time: [
                    "2026-11-20T00:00",
                    "2026-11-20T06:00",
                    "2026-11-20T07:00",
                    "2026-11-20T14:00",
                    "2026-11-21T06:00",
                  ],
                  pm2_5: [60.0, 95.0, 92.0, 35.0, 90.0],
                  pm10: [120.0, 170.0, 165.0, 70.0, 160.0],
                },
              }),
              { status: 200 },
            ),
          );
        }
        if (urlStr.includes("api.open-meteo.com/v1/forecast")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                current: { wind_speed_10m: 12, wind_direction_10m: 315 },
                hourly: {
                  time: [
                    "2026-11-20T00:00",
                    "2026-11-20T06:00",
                    "2026-11-20T07:00",
                    "2026-11-20T14:00",
                    "2026-11-21T06:00",
                  ],
                  relative_humidity_2m: [70, 84, 83, 48, 82],
                },
              }),
              { status: 200 },
            ),
          );
        }
        if (urlStr.includes("api.openaq.org/v3/locations?")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                results: [
                  {
                    id: 4242,
                    name: "OpenAQ Latest Sensor",
                    owner: { name: "CPCB Community" },
                    sensors: [{ id: 901, parameter: { name: "pm25" } }],
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }
        if (urlStr.includes("api.openaq.org/v3/locations/4242/latest")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                results: [{ sensorsId: 901, value: 64.5 }],
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(new Response("Not found", { status: 404 }));
      });

      const agg = await aggregateAirIntelligence(28.61, 77.21);
      // CQ-1: Multi-pollutant CPCB (117 Moderate, PM10) must match scaleComparisonExplanation
      expect(agg.currentConditions.cpcb.aqi).toBe(117);
      expect(agg.currentConditions.cpcb.category).toBe("Moderate");
      expect(agg.currentConditions.usEpa.aqi).toBe(139);
      expect(agg.currentConditions.scaleComparisonExplanation).toContain("117");
      expect(agg.currentConditions.scaleComparisonExplanation).toContain("Moderate");
      expect(agg.currentConditions.scaleComparisonExplanation).not.toContain(
        "Satisfactory",
      );

      // CQ-2: Real relative_humidity_2m (84% -> hygroscopic correction active)
      expect(agg.diurnalAnalysis.observations48h[1]?.humidityPct).toBe(84);
      expect(agg.diurnalAnalysis.worstToday?.wasHumidityAdjusted).toBe(true);

      // CQ-24: OpenAQ /locations/{id}/latest path
      expect(agg.groundStation?.stationName).toBe("OpenAQ Latest Sensor");
      expect(agg.groundStation?.stationPm25).toBe(64.5);

      // SEC-8: Non-integer OpenAQ loc.id must not trigger /latest fetch
      globalStationCache.clear();
      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("api.openaq.org/v3/locations?")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                results: [
                  {
                    id: 12.5,
                    name: "Malformed ID Station",
                    sensors: [{ id: 1, parameter: { name: "pm25" } }],
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }
        throw new Error(`Unexpected URL called: ${urlStr}`);
      });
      const skipped = await fetchGroundStationData(-0.001, -0.002, 50);
      expect(skipped).toBeNull();
    });

    it("should ingest Google Maps forecast:lookup when available and redact Bearer/header secrets", async () => {
      process.env.GOOGLE_MAPS_API_KEY = "gmaps_super_secret_token_123";
      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("currentConditions:lookup")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                pollutants: [{ code: "pm25", concentration: { value: 65.0 } }],
              }),
              { status: 200 },
            ),
          );
        }
        if (urlStr.includes("forecast:lookup")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                hourlyForecasts: [
                  {
                    dateTime: "2026-11-20T06:00:00Z",
                    pollutants: [
                      { code: "pm25", concentration: { value: 90.0 } },
                      { code: "pm10", concentration: { value: 150.0 } },
                    ],
                  },
                  {
                    dateTime: "2026-11-20T14:00:00Z",
                    pollutants: [
                      { code: "pm25", concentration: { value: 42.0 } },
                      { code: "pm10", concentration: { value: 80.0 } },
                    ],
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }
        if (urlStr.includes("api.open-meteo.com/v1/forecast")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                hourly: {
                  time: ["2026-11-20T06:00", "2026-11-20T14:00"],
                  relative_humidity_2m: [83, 45],
                },
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(new Response("Not found", { status: 404 }));
      });

      const gm = await fetchPrimaryAirQuality(28.61, 77.21);
      expect(gm.source).toBe("google_maps");
      expect(gm.forecastObservations).toHaveLength(2);
      expect(gm.forecastObservations[0]?.pm25).toBe(90.0);
      expect(gm.forecastObservations[0]?.humidityPct).toBe(83);

      const scrubbed = redactSecrets(
        "Authorization: Bearer abc123secretToken x-goog-api-key: gmaps_super_secret_token_123",
      );
      expect(scrubbed).not.toContain("abc123secretToken");
      expect(scrubbed).not.toContain("gmaps_super_secret_token_123");
    });

    it("should normalize Open-Meteo UTC timestamps, send Google Maps key via header, and redact secret URLs", async () => {
      expect(normalizeUtcTimestampToIso("2026-11-20T05:00")).toBe(
        "2026-11-20T05:00:00.000Z",
      );
      expect(
        redactSecrets(
          "Fetch failed https://api.waqi.info/feed/geo:28;77/?token=secret123&key=AIzaSyTestKeyValue12345",
        ),
      ).not.toContain("secret123");

      process.env.GOOGLE_MAPS_API_KEY = "gmaps_header_secret";
      let capturedUrl = "";
      let capturedHeader: string | null = null;

      globalThis.fetch = vi
        .fn()
        .mockImplementation((url: string | URL | Request, init?: RequestInit) => {
          const urlStr = url.toString();
          if (urlStr.includes("airquality.googleapis.com")) {
            capturedUrl = urlStr;
            const hdrs = new Headers(init?.headers);
            capturedHeader = hdrs.get("X-Goog-Api-Key");
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  pollutants: [{ code: "pm25", concentration: { value: 90 } }],
                }),
                { status: 200 },
              ),
            );
          }
          return Promise.resolve(new Response("Not found", { status: 404 }));
        });

      const res = await fetchPrimaryAirQuality(28.61, 77.21);
      expect(res.source).toBe("google_maps");
      expect(capturedUrl).not.toContain("gmaps_header_secret");
      expect(capturedHeader).toBe("gmaps_header_secret");
    });

    it("falls back to 48h deterministic diurnal curve when Open-Meteo returns empty hourly arrays", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("air-quality-api.open-meteo.com")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                current: { pm2_5: 80, pm10: 150 },
                hourly: { time: [] },
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(new Response("Not found", { status: 404 }));
      });

      const agg = await aggregateAirIntelligence(28.61, 77.21);
      expect(agg.currentConditions.pm25).toBe(80);
      expect(agg.currentConditions.pm10).toBe(150);
      expect(agg.diurnalAnalysis.observations48h).toHaveLength(48);
      expect(agg.diurnalAnalysis.cleanestToday).not.toBeNull();
      expect(agg.diurnalAnalysis.worstToday).not.toBeNull();
      expect(agg.diurnalAnalysis.cleanestTomorrow).not.toBeNull();
      expect(agg.diurnalAnalysis.worstTomorrow).not.toBeNull();
    });
  });
});
