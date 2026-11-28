import { type NextRequest, NextResponse } from "next/server";
import {
  AdvisorRequestSchema,
  DEFAULT_MAX_JSON_BYTES,
  generateAdvisorBriefing,
  globalAdvisorRateLimiter,
  handleGuardedApiRoute,
  parseJsonBodyWithLimit,
  validateSameOriginPost,
  type AdvisorMetricsInput,
} from "@/services";

export async function POST(request: NextRequest) {
  return handleGuardedApiRoute(
    "/api/advisor",
    request,
    async ({ rateLimitHeaders }) => {
      const originRejection = validateSameOriginPost(request);
      if (originRejection) {
        return originRejection;
      }

      const parsedBody = await parseJsonBodyWithLimit(request, DEFAULT_MAX_JSON_BYTES);
      if (!parsedBody.ok) {
        return parsedBody.response;
      }

      const validation = AdvisorRequestSchema.safeParse(parsedBody.data);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Bad Request",
            message: "Schema validation failed on environmental metrics input.",
            issues: validation.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
          { status: 400 },
        );
      }

      const input: AdvisorMetricsInput = validation.data;
      const result = await generateAdvisorBriefing(input);

      return NextResponse.json(result, {
        status: 200,
        headers: rateLimitHeaders,
      });
    },
    { rateLimiter: globalAdvisorRateLimiter },
  );
}
