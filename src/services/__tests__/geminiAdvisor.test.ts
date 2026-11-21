import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateAdvisorBriefing,
  generateDeterministicFallback,
  containsNumericDigits,
  type AdvisorMetricsInput,
} from "../geminiAdvisor";

describe("Service 4: geminiAdvisor & Guardrails", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  const mockInput: AdvisorMetricsInput = {
    cpcbAqi: 412,
    cpcbCategory: "Severe",
    usEpaAqi: 360,
    usEpaCategory: "Hazardous",
    satisfactoryIllusionAlert: false,
    cleanestWindowTime: "14:00 - 16:00",
    cleanestWindowPm25: 58.0,
    worstWindowTime: "06:00 - 08:00",
    worstWindowPm25: 245.0,
    grapStageId: "stage_3",
    grapStageName: "Stage III ('Severe')",
    archetype: "child_asthma",
    archetypeLabel: "Child with Asthma",
    upwindFireAlignment: "upwind_aligned",
    language: "en",
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("containsNumericDigits Helper", () => {
    it("should detect numeric digits in strings, arrays, and objects", () => {
      expect(containsNumericDigits("PM2.5 is elevated")).toBe(true);
      expect(containsNumericDigits("AQI reached 142 today")).toBe(true);
      expect(containsNumericDigits(["action_one", "code_99"])).toBe(true);
      expect(containsNumericDigits({ text: "clean", sub: "value 1" })).toBe(true);

      // Clean non-digit text
      expect(containsNumericDigits("Severe air pollution alert")).toBe(false);
      expect(containsNumericDigits(["action_one", "action_two"])).toBe(false);
      expect(
        containsNumericDigits({
          headline: "Action Required",
          body: "Stay indoors in clean air spaces.",
        }),
      ).toBe(false);
    });
  });

  describe("Deterministic Fallback Templates (Certified Engine Metrics)", () => {
    it("should populate English fallback with exact engine numbers", () => {
      const fallbackEn = generateDeterministicFallback(mockInput);
      expect(fallbackEn.familyBriefing).toContain("412 (Severe)");
      expect(fallbackEn.familyBriefing).toContain("14:00 - 16:00, 58 µg/m³");
      expect(fallbackEn.familyBriefing).toContain("06:00 - 08:00, 245 µg/m³");
      expect(fallbackEn.familyBriefing).toContain("Child with Asthma");
      expect(fallbackEn.familyBriefing).toContain(
        "Regional satellite tracking detects upwind biomass smoke",
      );
      expect(fallbackEn.rwaNoticeHeadline).toContain("GRAP Stage III ('Severe')");
      expect(fallbackEn.rwaNoticeBody).toContain(
        "CAQM statutory guidelines for CPCB AQI 412",
      );
    });

    it("should populate Hindi fallback with exact engine numbers in Devanagari context", () => {
      const inputHi: AdvisorMetricsInput = { ...mockInput, language: "hi" };
      const fallbackHi = generateDeterministicFallback(inputHi);
      expect(fallbackHi.familyBriefing).toContain("412");
      expect(fallbackHi.familyBriefing).toContain("Child with Asthma");
      expect(fallbackHi.familyBriefing).toContain("14:00 - 16:00");
      expect(fallbackHi.familyBriefing).toContain("पराली");
      expect(fallbackHi.rwaNoticeHeadline).toContain("ग्रेप Stage III ('Severe')");
    });

    it("should include Satisfactory Illusion warning in fallback when active", () => {
      const illusionInput: AdvisorMetricsInput = {
        ...mockInput,
        cpcbAqi: 75,
        cpcbCategory: "Satisfactory",
        usEpaAqi: 125,
        usEpaCategory: "Unhealthy for Sensitive Groups",
        satisfactoryIllusionAlert: true,
      };
      const fallback = generateDeterministicFallback(illusionInput);
      expect(fallback.familyBriefing).toContain(
        "ALERT: Local CPCB scale rates conditions benignly",
      );
    });
  });

  describe("Critical Untrusted Output Guardrails", () => {
    it("should reject Gemini response containing numeric digits and trigger deterministic fallback", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      // Gemini hallucinates digits: e.g. "PM2.5 is 142"
      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          topActionIds: ["action_hepa"],
                          familyBriefing:
                            "The PM2.5 level is 142 today so you must stay indoors.", // Contains digit '142'!
                          rwaNoticeHeadline: "Pollution Alert",
                          rwaNoticeBody: "Please comply with instructions.",
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        ),
      );

      const result = await generateAdvisorBriefing(mockInput);

      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toContain("GUARDRAIL_DIGIT_REJECTION");
      // Fallback is populated with certified numbers
      expect(result.output.familyBriefing).toContain("412 (Severe)");
    });

    it("should fallback cleanly when Gemini times out (> 3.5s)", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      // Mock fetch simulating timeout abort
      globalThis.fetch = vi.fn().mockImplementation((_url, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener("abort", () => {
              const err = new Error("The operation was aborted");
              err.name = "AbortError";
              reject(err);
            });
          }
        });
      });

      // Pass short 50ms timeout for fast unit test
      const result = await generateAdvisorBriefing(mockInput, { timeoutMs: 50 });

      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toContain("TIMEOUT_EXCEEDED");
      expect(result.output.familyBriefing).toContain("412 (Severe)");
    });

    it("should fallback cleanly when Gemini returns HTTP 429 Rate Limit", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      globalThis.fetch = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(new Response("RESOURCE_EXHAUSTED", { status: 429 })),
        );

      const result = await generateAdvisorBriefing(mockInput);

      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toBe("GEMINI_HTTP_429");
      expect(result.output.familyBriefing).toContain("412 (Severe)");
    });

    it("should fallback cleanly when Gemini returns HTTP 500 Server Error", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      globalThis.fetch = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(new Response("Internal Server Error", { status: 500 })),
        );

      const result = await generateAdvisorBriefing(mockInput);

      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toBe("GEMINI_HTTP_500");
    });

    it("should fallback cleanly when Gemini returns malformed non-JSON text", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: "This is not valid JSON string at all" }],
                  },
                },
              ],
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await generateAdvisorBriefing(mockInput);
      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toBe("INVALID_JSON_RESPONSE");
    });

    it("should fallback cleanly when Gemini response violates Zod schema", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          topActionIds: [], // Empty array violates .min(1)
                          familyBriefing: "Too short",
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200 },
          ),
        ),
      );

      const result = await generateAdvisorBriefing(mockInput);
      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toContain("ZOD_SCHEMA_VIOLATION");
    });

    it("should accept valid qualitative response with zero numeric digits", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      const validCleanJson = {
        topActionIds: ["active_hepa_purifier", "respirator_mask_seal"],
        familyBriefing:
          "Severe air pollution alert. Sensitive family members must remain indoors in rooms with high efficiency air filtration. Shift necessary walking to the afternoon clean ventilation window.",
        rwaNoticeHeadline: "Official Notice: High Air Quality Alert",
        rwaNoticeBody:
          "All residents must suspend diesel generator usage and prohibit dry street sweeping across the residential society.",
      };

      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: JSON.stringify(validCleanJson) }],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        ),
      );

      const result = await generateAdvisorBriefing(mockInput);

      expect(result.isFallback).toBe(false);
      expect(result.fallbackReason).toBeUndefined();
      expect(result.output.familyBriefing).toBe(validCleanJson.familyBriefing);
    });

    it("should fallback immediately if GEMINI_API_KEY is not set", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const result = await generateAdvisorBriefing(mockInput);
      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toBe("GEMINI_API_KEY_NOT_CONFIGURED");
    });
  });
});
