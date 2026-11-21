/**
 * VayuShield Backend Services
 * Module: geminiAdvisor.ts
 *
 * Implements:
 * 1. Guarded Gemini API decision layer using structured JSON output.
 * 2. Strict Input Isolation: Only pre-computed engine metrics are passed to Gemini;
 *    Gemini is NEVER asked to calculate numbers or exposure physics.
 * 3. Structured Output Schema:
 *    { topActionIds: string[], familyBriefing: string, rwaNoticeHeadline: string, rwaNoticeBody: string }
 * 4. Critical Untrusted Output Guardrails:
 *    - Strict digit-rejection regex (/\d/) to block hallucinated measurements.
 *    - Strict timeout abort (> 3.5 seconds).
 *    - Immediate fallback to deterministic, pre-verified templates in English or Hindi
 *      populated with exact, certified engine metrics.
 */

import { z } from "zod";
import type { HouseholdArchetype, GrapStageId } from "@/engine";
import type { UpwindAlignment } from "./airQualityAggregator";

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
  topActionIds: z.array(z.string().min(1)).min(1),
  familyBriefing: z.string().min(10),
  rwaNoticeHeadline: z.string().min(5),
  rwaNoticeBody: z.string().min(10),
});

export type AdvisorOutput = z.infer<typeof AdvisorOutputSchema>;

export interface AdvisorExecutionResult {
  output: AdvisorOutput;
  isFallback: boolean;
  fallbackReason?: string | undefined;
  executionDurationMs: number;
}

/**
 * Deterministic, pre-verified fallback templates populated with certified engine numbers.
 * Zero reliance on generative AI when errors, timeouts, or digit hallucinations occur.
 */
export function generateDeterministicFallback(input: AdvisorMetricsInput): AdvisorOutput {
  const isHindi = input.language === "hi";

  if (isHindi) {
    const illusionWarning = input.satisfactoryIllusionAlert
      ? "चेतावनी: स्थानीय सूचकांक इसे संतोषजनक दिखा सकता है, परंतु अंतरराष्ट्रीय स्वास्थ्य मानकों के अनुसार यह संवेदनशील व्यक्तियों के लिए हानिकारक है।"
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
        `वायु गुणवत्ता सूचकांक वर्तमान में ${input.cpcbAqi} (${input.cpcbCategory}) है। ` +
        `${input.archetypeLabel} के लिए विशेष सावधानी आवश्यक है। दोपहर के स्वच्छतम समय (${input.cleanestWindowTime}, अनुमानित ${input.cleanestWindowPm25} µg/m³) को प्राथमिकता दें। ` +
        `सुबह और रात के अत्यधिक प्रदूषित समय (${input.worstWindowTime}, ${input.worstWindowPm25} µg/m³) में बाहर जाने से बचें। ${illusionWarning} ${fireWarning}`,
      rwaNoticeHeadline: `आरडब्ल्यूए एडवाइजरी: ग्रेप ${input.grapStageName} वायु प्रदूषण प्रतिबंध लागू`,
      rwaNoticeBody:
        `सभी निवासियों को सूचित किया जाता है कि दिल्ली-एनसीआर में सीपीसीबी सूचकांक ${input.cpcbAqi} दर्ज हुआ है। ` +
        `सोसाइटी में सूखी झाड़ू लगाना, कचरा जलाना और डीजल जनरेटर का संचालन पूर्णतः प्रतिबंधित है। ` +
        `सुरक्षा गार्डों को हीटर उपलब्ध कराएं और प्राथमिक स्वास्थ्य सहायता केंद्र में स्वच्छ वायु कक्ष सक्रिय रखें।`,
    };
  }

  // English Deterministic Template
  const illusionText = input.satisfactoryIllusionAlert
    ? "ALERT: Local CPCB scale rates conditions benignly, but revised US EPA standards classify this level as Unhealthy for Sensitive Groups. Precautionary isolation is recommended."
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
      `Current CPCB AQI is ${input.cpcbAqi} (${input.cpcbCategory}). ` +
      `Protection protocol active for ${input.archetypeLabel}: restrict outdoor exertion during morning peak hours (${input.worstWindowTime}, ${input.worstWindowPm25} µg/m³). ` +
      `Shift mandatory ventilation or walking to the cleanest afternoon window (${input.cleanestWindowTime}, ${input.cleanestWindowPm25} µg/m³). ` +
      `${illusionText} ${fireText}`.trim(),
    rwaNoticeHeadline: `RWA NOTICE: GRAP ${input.grapStageName} MANDATE ENFORCED`,
    rwaNoticeBody:
      `In compliance with CAQM statutory guidelines for CPCB AQI ${input.cpcbAqi}, all non-essential DG sets are prohibited. ` +
      `Society housekeeping must avoid dry dust sweeping and utilize water sprinkling. ` +
      `Resident clean-air clubhouse shelter is active for vulnerable family members.`,
  };
}

/**
 * Strict digit-rejection guardrail:
 * Checks whether any string field in the response contains numeric digits (/\\d/).
 * Protects against hallucinated measurements (e.g. "PM2.5 is 142").
 */
export function containsNumericDigits(obj: unknown): boolean {
  if (typeof obj === "string") {
    return /\d/.test(obj);
  }
  if (Array.isArray(obj)) {
    return obj.some((item) => containsNumericDigits(item));
  }
  if (obj !== null && typeof obj === "object") {
    return Object.values(obj).some((val) => containsNumericDigits(val));
  }
  return false;
}

/**
 * Builds the qualitative prompt given to Gemini.
 * Explicitly forbids generating numeric digits to prevent hallucinated measurements.
 */
function buildGeminiPrompt(input: AdvisorMetricsInput): string {
  return (
    `You are the VayuShield Public Health & Environmental Advisor for Delhi-NCR.\n` +
    `Your task is to provide a brief, actionable family guidance summary and an official Resident Welfare Association (RWA) notice.\n\n` +
    `CURRENT CERTIFIED ENVIRONMENTAL STATUS:\n` +
    `- Local CPCB Classification: ${input.cpcbCategory}\n` +
    `- International US EPA Classification: ${input.usEpaCategory}\n` +
    `- Satisfactory Illusion Alert: ${input.satisfactoryIllusionAlert ? "ACTIVE (Health risk obscured by local scale)" : "INACTIVE"}\n` +
    `- Diurnal Window Advice: Shift outdoor exposure from morning/nocturnal peak to afternoon solar ventilation window\n` +
    `- Delhi-NCR GRAP Stage: ${input.grapStageName}\n` +
    `- Vulnerable Family Member: ${input.archetypeLabel}\n` +
    `- Regional Biomass Plume Alignment: ${input.upwindFireAlignment}\n` +
    `- Target Language: ${input.language === "hi" ? "Hindi (Devanagari script)" : "English"}\n\n` +
    `STRICT SAFETY CONSTRAINTS:\n` +
    `1. DO NOT include ANY numeric digits (0-9) anywhere in your output. Refer to values qualitatively (e.g., Severe tier, cleanest afternoon window, high boundary layer dispersion).\n` +
    `2. Deliver practical mitigation actions: N95 respirator seal, indoor HEPA filtration, exhaust venting, avoiding diesel emissions.\n` +
    `3. Output MUST be valid JSON matching this exact structure:\n` +
    `{\n` +
    `  "topActionIds": ["string_action_id_one", "string_action_id_two"],\n` +
    `  "familyBriefing": "qualitative prose guidance without any digits",\n` +
    `  "rwaNoticeHeadline": "headline without any digits",\n` +
    `  "rwaNoticeBody": "body text without any digits"\n` +
    `}`
  );
}

/**
 * Invokes Gemini API with strict 3.5s timeout, Zod verification, and digit guardrail.
 */
export async function generateAdvisorBriefing(
  input: AdvisorMetricsInput,
  options: {
    timeoutMs?: number | undefined;
    customApiKey?: string | undefined;
    modelOverride?: string | undefined;
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

  // Model hierarchy: environment override -> user parameter -> default
  const model = options.modelOverride ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash"; // Default to requested model, will work across supported Gemini endpoints

  const timeoutMs = options.timeoutMs ?? 3500;
  const prompt = buildGeminiPrompt(input);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        output: generateDeterministicFallback(input),
        isFallback: true,
        fallbackReason: `GEMINI_HTTP_${res.status}`,
        executionDurationMs: Date.now() - startTime,
      };
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return {
        output: generateDeterministicFallback(input),
        isFallback: true,
        fallbackReason: "EMPTY_GEMINI_RESPONSE",
        executionDurationMs: Date.now() - startTime,
      };
    }

    // 1. Parse JSON
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      return {
        output: generateDeterministicFallback(input),
        isFallback: true,
        fallbackReason: "INVALID_JSON_RESPONSE",
        executionDurationMs: Date.now() - startTime,
      };
    }

    // 2. Validate with Zod
    const zodResult = AdvisorOutputSchema.safeParse(parsedJson);
    if (!zodResult.success) {
      return {
        output: generateDeterministicFallback(input),
        isFallback: true,
        fallbackReason: `ZOD_SCHEMA_VIOLATION: ${zodResult.error.message}`,
        executionDurationMs: Date.now() - startTime,
      };
    }

    // 3. Strict Digit Rejection Guardrail
    if (containsNumericDigits(zodResult.data)) {
      return {
        output: generateDeterministicFallback(input),
        isFallback: true,
        fallbackReason:
          "GUARDRAIL_DIGIT_REJECTION: Numeric digits detected in LLM response text; risked hallucinated measurements.",
        executionDurationMs: Date.now() - startTime,
      };
    }

    return {
      output: zodResult.data,
      isFallback: false,
      executionDurationMs: Date.now() - startTime,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const isAbort =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("abort"));

    return {
      output: generateDeterministicFallback(input),
      isFallback: true,
      fallbackReason: isAbort ? "TIMEOUT_EXCEEDED (>3.5s)" : "NETWORK_ERROR",
      executionDurationMs: Date.now() - startTime,
    };
  }
}
