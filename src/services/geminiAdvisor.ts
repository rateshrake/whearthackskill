/**
 * VayuShield Backend Services
 * Module: geminiAdvisor.ts
 *
 * Implements:
 * 1. Guarded Gemini API decision layer using @google/genai Interactions API (gemini-4-hydrogen)
 *    with x-goog-api-key header authentication (never passing API keys in URL query strings).
 * 2. Strict Input Isolation: Only pre-computed engine metrics are passed to Gemini;
 *    system instructions are separated from sanitized metrics input.
 * 3. Structured JSON Output Schema & store: false for stateless privacy.
 * 4. Critical Untrusted Output Guardrails:
 *    - Unicode decimal digit rejection (/\p{Nd}/u) blocking ASCII and Devanagari digits.
 *    - Strict timeout abort (default 3.5s) + circuit breaker + no slow retries.
 *    - Immediate fallback to deterministic bilingual templates populated with verified engine metrics.
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { HouseholdArchetype, GrapStageId } from "@/engine";
import type { UpwindAlignment } from "./providers/upwindFire";
import { CACHE_TTL_MS, globalAdvisorCache } from "./gridCache";
import { getCircuitBreaker, redactSecrets } from "./resilientHttp";
import { recordUpstreamMetric } from "./observability";

export const DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen";

export interface AdvisorMetricsInput {
  cpcbAqi: number;
  cpcbCategory: string;
  usEpaAqi: number;
  usEpaCategory: string;
  satisfactoryIllusionAlert: boolean;
  cleanestWindowTime: string;
  cleanestWindowPm25: number;
  worstWindowTime: string;
  worstWindowPm25: number;
  grapStageId: GrapStageId;
  grapStageName: string;
  archetype: HouseholdArchetype;
  archetypeLabel: string;
  upwindFireAlignment: UpwindAlignment;
  language: "en" | "hi";
}

export const AdvisorOutputSchema = z.object({
  topActionIds: z.array(z.string().min(1).max(80)).min(1).max(8),
  familyBriefing: z.string().min(10).max(2000),
  rwaNoticeHeadline: z.string().min(5).max(240),
  rwaNoticeBody: z.string().min(10).max(2000),
});

export type AdvisorOutput = z.infer<typeof AdvisorOutputSchema>;

export interface AdvisorExecutionResult {
  output: AdvisorOutput;
  isFallback: boolean;
  fallbackReason?: string | undefined;
  executionDurationMs: number;
}

export interface AdvisorInteractionParams {
  apiKey: string;
  model: string;
  systemInstruction: string;
  input: string;
  timeoutMs: number;
  signal: AbortSignal;
}

export type AdvisorInteractionRunner = (
  params: AdvisorInteractionParams,
) => Promise<{ outputText?: string | null | undefined }>;

const ADVISOR_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["topActionIds", "familyBriefing", "rwaNoticeHeadline", "rwaNoticeBody"],
  properties: {
    topActionIds: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "string" },
    },
    familyBriefing: { type: "string" },
    rwaNoticeHeadline: { type: "string" },
    rwaNoticeBody: { type: "string" },
  },
} as const;

const ADVISOR_SYSTEM_INSTRUCTION =
  "You are the VayuShield Public Health & Environmental Advisor for urban India. " +
  "Provide a brief, actionable family guidance summary and an official Resident Welfare Association (RWA) notice " +
  "using ONLY qualitative guidance based on the provided metrics.\n" +
  "STRICT SAFETY CONSTRAINTS:\n" +
  "1. DO NOT include ANY numeric digits (ASCII 0-9 or Devanagari/Unicode digits) anywhere in your output. " +
  "Refer to tiers and exposure windows qualitatively (e.g., Severe tier, cleanest afternoon window, boundary layer dispersion).\n" +
  "2. Deliver practical mitigation actions such as fitted N-ninety-five respirator seals, indoor HEPA filtration, " +
  "exhaust venting, and avoiding diesel or biomass smoke.\n" +
  "3. Output MUST be valid JSON matching the required schema.";

function sanitizePromptText(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/**
 * Deterministic, pre-verified fallback templates populated with certified engine numbers.
 * Zero reliance on generative AI when errors, timeouts, or digit hallucinations occur.
 */
export function generateDeterministicFallback(input: AdvisorMetricsInput): AdvisorOutput {
  const isHindi = input.language === "hi";
  const safeCategory = sanitizePromptText(input.cpcbCategory);
  const safeArchetype = sanitizePromptText(input.archetypeLabel);
  const safeCleanWindow = sanitizePromptText(input.cleanestWindowTime);
  const safeWorstWindow = sanitizePromptText(input.worstWindowTime);
  const safeGrapName = sanitizePromptText(input.grapStageName);

  if (isHindi) {
    const illusionNote = input.satisfactoryIllusionAlert
      ? "पैमाना नोट: स्थानीय सीपीसीबी सूचकांक इसे सामान्य श्रेणी में दिखाता है, परंतु संशोधित यूएस ईपीए मानकों के अनुसार यह संवेदनशील वर्गों के लिए अस्वास्थ्यकर है; बाहरी गतिविधि हल्की रखें और इनडोर फिल्ट्रेशन का उपयोग करें।"
      : "";

    const fireWarning =
      input.upwindFireAlignment === "upwind_aligned"
        ? "हवा की दिशा उत्तर-पश्चिम कृषि क्षेत्रों में जल रही पराली के धुएं को सीधे राष्ट्रीय राजधानी क्षेत्र की ओर ला रही है।"
        : "";

    return {
      topActionIds: [
        "hepa_filtration_active",
        "n95_respirator_mandatory",
        "shift_outdoor_to_cleanest_window",
      ],
      familyBriefing:
        `वायु गुणवत्ता सूचकांक वर्तमान में ${input.cpcbAqi} (${safeCategory}) है। ` +
        `${safeArchetype} के लिए विशेष सावधानी आवश्यक है। सबसे स्वच्छ समय (${safeCleanWindow}, अनुमानित ${input.cleanestWindowPm25} µg/m³) को प्राथमिकता दें। ` +
        `अत्यधिक प्रदूषित समय (${safeWorstWindow}, ${input.worstWindowPm25} µg/m³) में बाहर जाने से बचें। ${illusionNote} ${fireWarning}`.trim(),
      rwaNoticeHeadline: `आरडब्ल्यूए एडवाइजरी: ग्रेप ${safeGrapName} वायु प्रदूषण प्रतिबंध लागू`,
      rwaNoticeBody:
        `सभी निवासियों को सूचित किया जाता है कि दिल्ली-एनसीआर में सीपीसीबी सूचकांक ${input.cpcbAqi} दर्ज हुआ है। ` +
        `सोसाइटी में सूखी झाड़ू लगाना, कचरा जलाना और डीजल जनरेटर का संचालन पूर्णतः प्रतिबंधित है। ` +
        `सुरक्षा गार्डों को हीटर उपलब्ध कराएं और प्राथमिक स्वास्थ्य सहायता केंद्र में स्वच्छ वायु कक्ष सक्रिय रखें।`,
    };
  }

  const illusionText = input.satisfactoryIllusionAlert
    ? "Scale Note: Local CPCB scale rates conditions mildly, while revised US EPA 2024 standards classify this PM2.5 level as Unhealthy for Sensitive Groups. Gentler outdoor pacing and indoor filtration are recommended."
    : "";

  const fireText =
    input.upwindFireAlignment === "upwind_aligned"
      ? "Regional satellite tracking detects upwind biomass smoke plumes channeled directly along the boundary layer transport corridor."
      : "";

  return {
    topActionIds: [
      "hepa_filtration_active",
      "n95_respirator_mandatory",
      "shift_outdoor_to_cleanest_window",
    ],
    familyBriefing:
      `Current CPCB AQI is ${input.cpcbAqi} (${safeCategory}). ` +
      `Protection protocol active for ${safeArchetype}: restrict outdoor exertion during peak hours (${safeWorstWindow}, ${input.worstWindowPm25} µg/m³). ` +
      `Shift mandatory ventilation or walking to the cleanest window (${safeCleanWindow}, ${input.cleanestWindowPm25} µg/m³). ` +
      `${illusionText} ${fireText}`.trim(),
    rwaNoticeHeadline: `RWA NOTICE: GRAP ${safeGrapName} MANDATE ENFORCED`,
    rwaNoticeBody:
      `In compliance with CAQM statutory guidelines for CPCB AQI ${input.cpcbAqi}, all non-essential DG sets are prohibited. ` +
      `Society housekeeping must avoid dry dust sweeping and utilize water sprinkling. ` +
      `Resident clean-air clubhouse shelter is active for vulnerable family members.`,
  };
}

/**
 * Strict digit-rejection guardrail:
 * Checks whether any string field in the response contains Unicode decimal digits (/\p{Nd}/u),
 * blocking ASCII digits (0-9) as well as Devanagari numerals (०-९).
 */
export function containsNumericDigits(obj: unknown): boolean {
  if (typeof obj === "string") {
    return /\p{Nd}/u.test(obj);
  }
  if (Array.isArray(obj)) {
    return obj.some((item) => containsNumericDigits(item));
  }
  if (obj !== null && typeof obj === "object") {
    return Object.values(obj).some((val) => containsNumericDigits(val));
  }
  return false;
}

function describeWindowPeriod(windowTime: string): string {
  const hourMatch = /^(\d{2}):/.exec(windowTime.trim());
  if (!hourMatch?.[1]) return "daytime";
  const hour = Number.parseInt(hourMatch[1], 10);
  if (hour >= 4 && hour < 9) return "early morning inversion";
  if (hour >= 9 && hour < 12) return "late morning";
  if (hour >= 12 && hour < 17) return "afternoon solar mixing";
  if (hour >= 17 && hour < 21) return "evening transition";
  return "nocturnal inversion";
}

function buildAdvisorCacheKey(input: AdvisorMetricsInput): string {
  return [
    "adv",
    input.cpcbCategory,
    input.usEpaCategory,
    input.satisfactoryIllusionAlert ? "1" : "0",
    input.grapStageId,
    input.archetype,
    input.upwindFireAlignment,
    input.language,
    describeWindowPeriod(input.cleanestWindowTime),
    describeWindowPeriod(input.worstWindowTime),
  ].join(":");
}

const genAiClientPool = new Map<string, GoogleGenAI>();

function getGenAiClient(apiKey: string): GoogleGenAI {
  const existing = genAiClientPool.get(apiKey);
  if (existing) {
    return existing;
  }
  if (genAiClientPool.size >= 8) {
    const oldestKey = genAiClientPool.keys().next().value;
    if (oldestKey !== undefined) {
      genAiClientPool.delete(oldestKey);
    }
  }
  const client = new GoogleGenAI({ apiKey });
  genAiClientPool.set(apiKey, client);
  return client;
}

function buildAdvisorInputContext(input: AdvisorMetricsInput): string {
  const cleanestCue = describeWindowPeriod(input.cleanestWindowTime);
  const worstCue = describeWindowPeriod(input.worstWindowTime);

  return (
    `CURRENT CERTIFIED ENVIRONMENTAL STATUS:\n` +
    `- Local CPCB Classification: ${sanitizePromptText(input.cpcbCategory)}\n` +
    `- International US EPA Classification: ${sanitizePromptText(input.usEpaCategory)}\n` +
    `- Scale Difference Note: ${input.satisfactoryIllusionAlert ? "ACTIVE (International thresholds stricter than local classification)" : "INACTIVE"}\n` +
    `- Diurnal Window Advice: Shift outdoor activity from ${worstCue} peak to ${cleanestCue} cleanest window\n` +
    `- Delhi-NCR GRAP Stage: ${sanitizePromptText(input.grapStageName)}\n` +
    `- Vulnerable Family Member: ${sanitizePromptText(input.archetypeLabel)}\n` +
    `- Regional Biomass Plume Alignment: ${input.upwindFireAlignment}\n` +
    `- Target Language: ${input.language === "hi" ? "Hindi (Devanagari script)" : "English"}`
  );
}

const defaultInteractionRunner: AdvisorInteractionRunner = async ({
  apiKey,
  model,
  systemInstruction,
  input,
  timeoutMs,
  signal,
}) => {
  const ai = getGenAiClient(apiKey);
  const interaction = await ai.interactions.create(
    {
      model,
      system_instruction: systemInstruction,
      input,
      store: false,
      generation_config: {
        thinking_level: "low",
      },
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: ADVISOR_RESPONSE_JSON_SCHEMA,
      },
    },
    {
      timeout_ms: timeoutMs,
      retries: { strategy: "none" },
      signal,
    },
  );

  let fallbackStepText: string | undefined;
  if (!interaction.output_text && Array.isArray(interaction.steps)) {
    for (let i = interaction.steps.length - 1; i >= 0; i--) {
      const step = interaction.steps[i];
      if (step?.type === "model_output" && Array.isArray(step.content)) {
        const textBlock = step.content.find(
          (c): c is { type: "text"; text: string } =>
            c.type === "text" && typeof c.text === "string",
        );
        if (textBlock) {
          fallbackStepText = textBlock.text;
          break;
        }
      }
    }
  }

  return { outputText: interaction.output_text ?? fallbackStepText ?? null };
};

function extractHttpStatus(error: unknown): number | undefined {
  if (error !== null && typeof error === "object") {
    if ("status" in error && typeof error.status === "number") {
      return error.status;
    }
    if ("statusCode" in error && typeof error.statusCode === "number") {
      return error.statusCode;
    }
  }
  return undefined;
}

function isAbortOrTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const lowerMsg = error.message.toLowerCase();
  return (
    error.name === "AbortError" ||
    error.name === "RequestTimeoutError" ||
    error.name === "APIUserAbortError" ||
    error.name === "TimeoutError" ||
    lowerMsg.includes("abort") ||
    lowerMsg.includes("timeout")
  );
}

/**
 * Invokes Gemini Interactions API (gemini-4-hydrogen) via @google/genai SDK
 * with strict 3.5s timeout, circuit breaker, Zod verification, and Unicode digit guardrail.
 */
export async function generateAdvisorBriefing(
  input: AdvisorMetricsInput,
  options: {
    timeoutMs?: number | undefined;
    customApiKey?: string | undefined;
    modelOverride?: string | undefined;
    interactionRunner?: AdvisorInteractionRunner | undefined;
  } = {},
): Promise<AdvisorExecutionResult> {
  const startTime = Date.now();
  const apiKey =
    options.customApiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return {
      output: generateDeterministicFallback(input),
      isFallback: true,
      fallbackReason: "GEMINI_API_KEY_NOT_CONFIGURED",
      executionDurationMs: Date.now() - startTime,
    };
  }

  const canUseCache =
    options.interactionRunner === undefined &&
    options.customApiKey === undefined &&
    options.modelOverride === undefined;
  const cacheKey = canUseCache ? buildAdvisorCacheKey(input) : null;

  if (cacheKey) {
    const cached = globalAdvisorCache.get(cacheKey);
    if (cached && !cached.isFallback) {
      return {
        ...cached,
        executionDurationMs: Date.now() - startTime,
      };
    }
  }

  const breaker = getCircuitBreaker("gemini");
  if (!breaker.canAttempt()) {
    recordUpstreamMetric("gemini", false, 0);
    return {
      output: generateDeterministicFallback(input),
      isFallback: true,
      fallbackReason: "GEMINI_CIRCUIT_OPEN",
      executionDurationMs: Date.now() - startTime,
    };
  }

  const model = options.modelOverride ?? process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const timeoutMs = Math.max(50, options.timeoutMs ?? 3500);
  const runner = options.interactionRunner ?? defaultInteractionRunner;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await runner({
      apiKey,
      model,
      systemInstruction: ADVISOR_SYSTEM_INSTRUCTION,
      input: buildAdvisorInputContext(input),
      timeoutMs,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rawText = response.outputText?.trim();
    if (!rawText) {
      breaker.recordFailure();
      recordUpstreamMetric("gemini", false, Date.now() - startTime);
      return {
        output: generateDeterministicFallback(input),
        isFallback: true,
        fallbackReason: "EMPTY_GEMINI_RESPONSE",
        executionDurationMs: Date.now() - startTime,
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      breaker.recordFailure();
      recordUpstreamMetric("gemini", false, Date.now() - startTime);
      return {
        output: generateDeterministicFallback(input),
        isFallback: true,
        fallbackReason: "INVALID_JSON_RESPONSE",
        executionDurationMs: Date.now() - startTime,
      };
    }

    const zodResult = AdvisorOutputSchema.safeParse(parsedJson);
    if (!zodResult.success) {
      breaker.recordFailure();
      recordUpstreamMetric("gemini", false, Date.now() - startTime);
      return {
        output: generateDeterministicFallback(input),
        isFallback: true,
        fallbackReason: `ZOD_SCHEMA_VIOLATION: ${redactSecrets(zodResult.error.message)}`,
        executionDurationMs: Date.now() - startTime,
      };
    }

    if (containsNumericDigits(zodResult.data)) {
      breaker.recordFailure();
      recordUpstreamMetric("gemini", false, Date.now() - startTime);
      return {
        output: generateDeterministicFallback(input),
        isFallback: true,
        fallbackReason:
          "GUARDRAIL_DIGIT_REJECTION: Numeric digits detected in LLM response text; risked hallucinated measurements.",
        executionDurationMs: Date.now() - startTime,
      };
    }

    breaker.recordSuccess();
    recordUpstreamMetric("gemini", true, Date.now() - startTime);
    const successResult: AdvisorExecutionResult = {
      output: zodResult.data,
      isFallback: false,
      executionDurationMs: Date.now() - startTime,
    };
    if (cacheKey) {
      globalAdvisorCache.set(cacheKey, successResult, CACHE_TTL_MS.ADVISOR);
    }
    return successResult;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    breaker.recordFailure();
    recordUpstreamMetric("gemini", false, Date.now() - startTime);

    const httpStatus = extractHttpStatus(error);
    if (httpStatus !== undefined) {
      return {
        output: generateDeterministicFallback(input),
        isFallback: true,
        fallbackReason: `GEMINI_HTTP_${httpStatus}`,
        executionDurationMs: Date.now() - startTime,
      };
    }

    return {
      output: generateDeterministicFallback(input),
      isFallback: true,
      fallbackReason: isAbortOrTimeoutError(error)
        ? "TIMEOUT_EXCEEDED (>3.5s)"
        : "NETWORK_ERROR",
      executionDurationMs: Date.now() - startTime,
    };
  }
}
