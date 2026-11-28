import { type NextRequest, NextResponse } from "next/server";
import {
  aggregateAirIntelligence,
  generateAdvisorBriefing,
  handleGuardedApiRoute,
  IntelligenceQuerySchema,
  type AdvisorMetricsInput,
} from "@/services";
import { HOUSEHOLD_ARCHETYPES, mapAqiToGrapStage } from "@/engine";

const IST_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatWindowTimeIst(
  startIso: string | undefined,
  endIso: string | undefined,
  fallbackRange: string,
): string {
  if (!startIso || !endIso) return fallbackRange;
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return fallbackRange;
  return `${IST_TIME_FORMATTER.format(startMs)} - ${IST_TIME_FORMATTER.format(endMs)} IST`;
}

export async function GET(request: NextRequest) {
  return handleGuardedApiRoute(
    "/api/intelligence",
    request,
    async ({ rateLimitHeaders }) => {
      const { searchParams } = new URL(request.url);
      const validation = IntelligenceQuerySchema.safeParse({
        lat: searchParams.get("lat") ?? undefined,
        lon: searchParams.get("lon") ?? undefined,
        lang: searchParams.get("lang") ?? "en",
        archetype: searchParams.get("archetype") ?? "child_asthma",
      });

      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Bad Request",
            message: "Invalid parameters provided to intelligence engine.",
            issues: validation.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
          { status: 400 },
        );
      }

      const { lat, lon, lang, archetype } = validation.data;
      const payload = await aggregateAirIntelligence(lat, lon);
      const grapStage = mapAqiToGrapStage(payload.currentConditions.cpcb.aqi);

      const advisorInput: AdvisorMetricsInput = {
        cpcbAqi: payload.currentConditions.cpcb.aqi,
        cpcbCategory: payload.currentConditions.cpcb.category,
        usEpaAqi: payload.currentConditions.usEpa.aqi,
        usEpaCategory: payload.currentConditions.usEpa.category,
        satisfactoryIllusionAlert: payload.currentConditions.satisfactoryIllusionAlert,
        cleanestWindowTime: formatWindowTimeIst(
          payload.diurnalAnalysis.cleanestToday?.startTimeIso,
          payload.diurnalAnalysis.cleanestToday?.endTimeIso,
          "14:00 - 16:00 IST",
        ),
        cleanestWindowPm25: payload.diurnalAnalysis.cleanestToday?.averagePm25 ?? 55.0,
        worstWindowTime: formatWindowTimeIst(
          payload.diurnalAnalysis.worstToday?.startTimeIso,
          payload.diurnalAnalysis.worstToday?.endTimeIso,
          "06:00 - 08:00 IST",
        ),
        worstWindowPm25: payload.diurnalAnalysis.worstToday?.averagePm25 ?? 220.0,
        grapStageId: grapStage.stage,
        grapStageName: grapStage.stageName,
        archetype,
        archetypeLabel: HOUSEHOLD_ARCHETYPES[archetype].label,
        upwindFireAlignment: payload.upwindFireContext.alignment,
        language: lang,
      };

      const advisorResult = await generateAdvisorBriefing(advisorInput);

      return NextResponse.json(
        {
          intelligence: payload,
          advisor: advisorResult,
        },
        {
          status: 200,
          headers: rateLimitHeaders,
        },
      );
    },
  );
}
