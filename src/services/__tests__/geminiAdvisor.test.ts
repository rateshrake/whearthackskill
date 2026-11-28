import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateAdvisorBriefing,
  generateDeterministicFallback,
  containsNumericDigits,
  DEFAULT_GEMINI_MODEL,
  type AdvisorMetricsInput,
} from "../geminiAdvisor";
import { resetAllCircuitBreakers } from "../resilientHttp";
import { globalAdvisorCache } from "../gridCache";

function createInteractionResponse(text: string): Response {
  return new Response(
    JSON.stringify({
      id: "int_test_1",
      status: "completed",
      model: DEFAULT_GEMINI_MODEL,
      steps: [
        {
          type: "model_output",
          content: [{ type: "text", text }],
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

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
    resetAllCircuitBreakers();
    globalAdvisorCache.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("containsNumericDigits Helper", () => {
    it("should detect ASCII and Unicode/Devanagari digits in strings, arrays, and objects", () => {
      expect(containsNumericDigits("PM2.5 is elevated")).toBe(true);
      expect(containsNumericDigits("AQI reached 142 today")).toBe(true);
      expect(containsNumericDigits("प्रदूषण स्तर ४१२ है")).toBe(true);
      expect(containsNumericDigits(["action_one", "code_99"])).toBe(true);
      expect(containsNumericDigits({ text: "clean", sub: "value 1" })).toBe(true);

      // Clean non-digit text
      expect(containsNumericDigits("Severe air pollution alert")).toBe(false);
      expect(containsNumericDigits("गंभीर वायु प्रदूषण चेतावनी")).toBe(false);
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

    it("should include calm scale difference note in fallback when active", () => {
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
        "Scale Note: Local CPCB scale rates conditions mildly",
      );
      expect(fallback.familyBriefing).not.toContain("ALERT:");
    });
  });

  describe("Critical Untrusted Output Guardrails & @google/genai Interactions SDK", () => {
    it("should authenticate via header (never URL ?key=) and use gemini-4-hydrogen", async () => {
      process.env.GEMINI_API_KEY = "mock_secret_key";

      let capturedUrl = "";
      let capturedAuthHeader: string | null = null;
      let capturedBodyText = "";

      const validCleanJson = {
        topActionIds: ["active_hepa_purifier", "respirator_mask_seal"],
        familyBriefing:
          "Severe air pollution alert. Sensitive family members must remain indoors with high efficiency filtration and shift essential walks to the cleanest afternoon window.",
        rwaNoticeHeadline: "Official Notice: High Air Quality Alert",
        rwaNoticeBody:
          "All residents must suspend diesel generator usage and prohibit dry street sweeping across the residential society.",
      };

      globalThis.fetch = vi
        .fn()
        .mockImplementation(async (inputArg: RequestInfo | URL) => {
          if (inputArg instanceof Request) {
            capturedUrl = inputArg.url;
            capturedAuthHeader = inputArg.headers.get("x-goog-api-key");
            capturedBodyText = await inputArg.clone().text();
          } else {
            capturedUrl = inputArg.toString();
          }
          return createInteractionResponse(JSON.stringify(validCleanJson));
        });

      const result = await generateAdvisorBriefing(mockInput);

      expect(result.isFallback).toBe(false);
      expect(result.fallbackReason).toBeUndefined();
      expect(result.output.familyBriefing).toBe(validCleanJson.familyBriefing);
      expect(capturedUrl).toContain("/interactions");
      expect(capturedUrl).not.toContain("mock_secret_key");
      expect(capturedAuthHeader).toBe("mock_secret_key");
      expect(capturedBodyText).toContain(DEFAULT_GEMINI_MODEL);
    });

    it("should reject Gemini response containing ASCII or Devanagari digits and trigger fallback", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      const resultAscii = await generateAdvisorBriefing(mockInput, {
        interactionRunner: async () => ({
          outputText: JSON.stringify({
            topActionIds: ["action_hepa"],
            familyBriefing:
              "The particulate level is 142 today so you must stay indoors.",
            rwaNoticeHeadline: "Pollution Alert",
            rwaNoticeBody: "Please comply with clean air instructions.",
          }),
        }),
      });

      expect(resultAscii.isFallback).toBe(true);
      expect(resultAscii.fallbackReason).toContain("GUARDRAIL_DIGIT_REJECTION");
      expect(resultAscii.output.familyBriefing).toContain("412 (Severe)");

      const resultDevanagari = await generateAdvisorBriefing(mockInput, {
        interactionRunner: async () => ({
          outputText: JSON.stringify({
            topActionIds: ["action_hepa"],
            familyBriefing: "आज वायु स्तर ४५० के पार है इसलिए घर के अंदर ही रहें।",
            rwaNoticeHeadline: "वायु प्रदूषण चेतावनी",
            rwaNoticeBody: "सभी निवासी नियमों का पालन करें।",
          }),
        }),
      });

      expect(resultDevanagari.isFallback).toBe(true);
      expect(resultDevanagari.fallbackReason).toContain("GUARDRAIL_DIGIT_REJECTION");
    });

    it("should fallback cleanly when Gemini times out (> 3.5s)", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      const result = await generateAdvisorBriefing(mockInput, {
        timeoutMs: 50,
        interactionRunner: async ({ signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => {
              const err = new Error("The operation was aborted");
              err.name = "AbortError";
              reject(err);
            });
          }),
      });

      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toContain("TIMEOUT_EXCEEDED");
      expect(result.output.familyBriefing).toContain("412 (Severe)");
    });

    it("should fallback cleanly when Gemini returns HTTP 429 Rate Limit", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: { message: "RESOURCE_EXHAUSTED" } }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      const result = await generateAdvisorBriefing(mockInput);

      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toBe("GEMINI_HTTP_429");
      expect(result.output.familyBriefing).toContain("412 (Severe)");
    });

    it("should fallback cleanly when Gemini returns HTTP 500 Server Error", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: { message: "Internal Server Error" } }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );

      const result = await generateAdvisorBriefing(mockInput);

      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toBe("GEMINI_HTTP_500");
    });

    it("should fallback cleanly when Gemini returns malformed non-JSON text", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      globalThis.fetch = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            createInteractionResponse("This is not valid JSON string at all"),
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
          createInteractionResponse(
            JSON.stringify({
              topActionIds: [],
              familyBriefing: "Too short",
            }),
          ),
        ),
      );

      const result = await generateAdvisorBriefing(mockInput);
      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toContain("ZOD_SCHEMA_VIOLATION");
    });

    it("should fallback immediately when circuit breaker is open after repeated failures", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      for (let i = 0; i < 5; i++) {
        await generateAdvisorBriefing(mockInput, {
          interactionRunner: async () => {
            throw new Error("Connection reset");
          },
        });
      }

      const openResult = await generateAdvisorBriefing(mockInput, {
        interactionRunner: async () => {
          throw new Error("Should not be called while circuit is open");
        },
      });
      expect(openResult.isFallback).toBe(true);
      expect(openResult.fallbackReason).toBe("GEMINI_CIRCUIT_OPEN");
    });

    it("should fallback immediately if GEMINI_API_KEY is not set", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const result = await generateAdvisorBriefing(mockInput);
      expect(result.isFallback).toBe(true);
      expect(result.fallbackReason).toBe("GEMINI_API_KEY_NOT_CONFIGURED");
    });

    it("should trip circuit breaker after repeated invalid JSON or schema rejections", async () => {
      process.env.GEMINI_API_KEY = "mock_key";

      for (let i = 0; i < 5; i++) {
        const bad = await generateAdvisorBriefing(mockInput, {
          interactionRunner: async () => ({ outputText: "{not-json" }),
        });
        expect(bad.fallbackReason).toBe("INVALID_JSON_RESPONSE");
      }

      const tripped = await generateAdvisorBriefing(mockInput, {
        interactionRunner: async () => {
          throw new Error("Should not execute when breaker is open");
        },
      });
      expect(tripped.isFallback).toBe(true);
      expect(tripped.fallbackReason).toBe("GEMINI_CIRCUIT_OPEN");
    });

    it("should cache non-fallback advisor responses via globalAdvisorCache and include diurnal cues", async () => {
      process.env.GEMINI_API_KEY = "mock_cache_test_key";
      let capturedBody = "";
      const fetchMock = vi
        .fn()
        .mockImplementation(async (inputArg: RequestInfo | URL) => {
          if (inputArg instanceof Request) {
            capturedBody = await inputArg.clone().text();
          }
          return createInteractionResponse(
            JSON.stringify({
              topActionIds: ["hepa_purifier_active"],
              familyBriefing:
                "Shift outdoor exertion to the cleanest afternoon mixing window and run indoor filtration continuously.",
              rwaNoticeHeadline: "RWA Clean Air Advisory",
              rwaNoticeBody:
                "Please minimize outdoor combustion and keep indoor clean-air spaces active.",
            }),
          );
        });
      globalThis.fetch = fetchMock;

      const first = await generateAdvisorBriefing(mockInput);
      expect(first.isFallback).toBe(false);
      expect(capturedBody).toContain("afternoon solar mixing");
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const second = await generateAdvisorBriefing(mockInput);
      expect(second.isFallback).toBe(false);
      expect(second.output.familyBriefing).toBe(first.output.familyBriefing);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
