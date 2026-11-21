import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as airQualityHandler } from "@/app/api/air-quality/route";
import { POST as advisorHandler } from "@/app/api/advisor/route";
import { globalRateLimiter } from "../rateLimiter";
import { globalForecastCache } from "../gridCache";

describe("Service 5: API Routes & Edge Validation", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalRateLimiter.reset();
    globalForecastCache.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("GET /api/air-quality", () => {
    it("should reject invalid/missing coordinates with HTTP 400 and Zod details", async () => {
      // 1. Missing lat/lon
      const req1 = new NextRequest("http://localhost:3000/api/air-quality");
      const res1 = await airQualityHandler(req1);
      expect(res1.status).toBe(400);
      const json1 = await res1.json();
      expect(json1.error).toBe("Bad Request");

      // 2. Latitude out of bounds (> 90)
      const req2 = new NextRequest(
        "http://localhost:3000/api/air-quality?lat=95.5&lon=77.2",
      );
      const res2 = await airQualityHandler(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.message).toContain("Invalid geographical coordinates");

      // 3. Longitude out of bounds (< -180)
      const req3 = new NextRequest(
        "http://localhost:3000/api/air-quality?lat=28.6&lon=-195.0",
      );
      const res3 = await airQualityHandler(req3);
      expect(res3.status).toBe(400);
    });

    it("should return HTTP 429 when rate limit is exceeded on the same IP", async () => {
      // Configure mock fetch for success
      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              hourly: {
                time: ["2026-11-20T00:00"],
                pm2_5: [80],
                pm10: [150],
                nitrogen_dioxide: [40],
                ozone: [30],
                sulphur_dioxide: [10],
                carbon_monoxide: [800],
              },
            }),
            { status: 200 },
          ),
        ),
      );

      const targetIp = "203.0.113.195";

      // Send 30 requests up to limit
      for (let i = 0; i < 30; i++) {
        const req = new NextRequest(
          "http://localhost:3000/api/air-quality?lat=28.61&lon=77.21",
          {
            headers: { "x-forwarded-for": targetIp },
          },
        );
        const res = await airQualityHandler(req);
        expect(res.status).toBe(200);
      }

      // 31st request triggers rate limiter
      const blockedReq = new NextRequest(
        "http://localhost:3000/api/air-quality?lat=28.61&lon=77.21",
        {
          headers: { "x-forwarded-for": targetIp },
        },
      );
      const blockedRes = await airQualityHandler(blockedReq);

      expect(blockedRes.status).toBe(429);
      const blockedJson = await blockedRes.json();
      expect(blockedJson.error).toBe("Too Many Requests");
      expect(blockedRes.headers.get("Retry-After")).toBeDefined();
    });

    it("should return 200 with security headers for valid coordinates", async () => {
      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              hourly: {
                time: ["2026-11-20T00:00"],
                pm2_5: [95.0],
                pm10: [180.0],
                nitrogen_dioxide: [45.0],
                ozone: [32.0],
                sulphur_dioxide: [14.0],
                carbon_monoxide: [850.0],
              },
            }),
            { status: 200 },
          ),
        ),
      );

      const req = new NextRequest(
        "http://localhost:3000/api/air-quality?lat=28.6139&lon=77.2090",
      );
      const res = await airQualityHandler(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
      expect(res.headers.get("Content-Security-Policy")).toBeDefined();

      const json = await res.json();
      expect(json.quantizedCoordinates.lat).toBe(28.61);
      expect(json.quantizedCoordinates.lon).toBe(77.21);
    });
  });

  describe("POST /api/advisor", () => {
    it("should reject malformed JSON with HTTP 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/advisor", {
        method: "POST",
        body: "invalid-json-text",
      });
      const res = await advisorHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toBe("Invalid JSON request payload.");
    });

    it("should reject body violating Zod schema with HTTP 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpcbAqi: -10, // Invalid: min is 0
          grapStageId: "unknown_stage", // Invalid enum
        }),
      });
      const res = await advisorHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Bad Request");
    });

    it("should execute advisor briefing and return 200 with security headers for valid payload", async () => {
      const validPayload = {
        cpcbAqi: 340,
        cpcbCategory: "Very Poor",
        usEpaAqi: 280,
        usEpaCategory: "Very Unhealthy",
        satisfactoryIllusionAlert: false,
        cleanestWindowTime: "14:00 - 16:00",
        cleanestWindowPm25: 65.0,
        worstWindowTime: "06:00 - 08:00",
        worstWindowPm25: 210.0,
        grapStageId: "stage_2",
        grapStageName: "Stage II ('Very Poor')",
        archetype: "general_adult",
        archetypeLabel: "General Adult",
        upwindFireAlignment: "none_detected",
        language: "en",
      };

      const req = new NextRequest("http://localhost:3000/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      });

      const res = await advisorHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      const json = await res.json();
      expect(json.output).toBeDefined();
      expect(json.output.familyBriefing).toBeDefined();
    });
  });
});
