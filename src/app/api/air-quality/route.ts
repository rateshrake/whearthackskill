import { type NextRequest, NextResponse } from "next/server";
import {
  aggregateAirIntelligence,
  CoordinatesQuerySchema,
  handleGuardedApiRoute,
} from "@/services";

export async function GET(request: NextRequest) {
  return handleGuardedApiRoute(
    "/api/air-quality",
    request,
    async ({ rateLimitHeaders }) => {
      const { searchParams } = new URL(request.url);
      const validation = CoordinatesQuerySchema.safeParse({
        lat: searchParams.get("lat") ?? undefined,
        lon: searchParams.get("lon") ?? undefined,
      });

      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Bad Request",
            message: "Invalid geographical coordinates provided.",
            issues: validation.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
          { status: 400 },
        );
      }

      const { lat, lon } = validation.data;
      const payload = await aggregateAirIntelligence(lat, lon);

      return NextResponse.json(payload, {
        status: 200,
        headers: rateLimitHeaders,
      });
    },
  );
}
