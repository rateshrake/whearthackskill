/**
 * VayuShield Backend Services
 * Module: httpApiGuard.ts
 *
 * Deep module centralizing HTTP API boundary controls:
 * - Trusted reverse-proxy client IP extraction (rightmost X-Forwarded-For hop parsing)
 * - Bounded sliding-window rate limiting with standard headers
 * - Request body byte-size enforcement prior to JSON parsing
 * - Sanitized HTTP 500 error handling (no raw exception or secret leakage)
 * - RED observability metric recording and API security headers
 */

import { type NextRequest, NextResponse } from "next/server";
import { globalRateLimiter, type RateLimitResult } from "./rateLimiter";
import { applyApiSecurityHeaders } from "./securityHeaders";
import { redactSecrets } from "./resilientHttp";
import { recordRouteMetric, type MonitoredRoute } from "./observability";

export const DEFAULT_MAX_JSON_BYTES = 16 * 1024; // 16 KB

/**
 * Extracts client IP securely behind trusted reverse proxies (e.g. Google Cloud Run GFE).
 * Reads from the RIGHT end of X-Forwarded-For so arbitrary leftmost client-spoofed
 * headers cannot bypass per-IP rate limiting.
 */
export function extractTrustedClientIp(
  request: NextRequest,
  trustedProxyHops?: number,
): string {
  const configuredHops = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");
  const hops = Math.max(
    1,
    Number.isFinite(trustedProxyHops)
      ? Math.floor(trustedProxyHops!)
      : Number.isFinite(configuredHops) && configuredHops >= 1
        ? Math.floor(configuredHops)
        : 1,
  );

  const xffHeader = request.headers.get("x-forwarded-for");
  if (xffHeader) {
    const parts = xffHeader
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (parts.length > 0) {
      const targetIndex = Math.max(0, parts.length - hops);
      const selected = parts[targetIndex];
      if (selected) return selected;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "127.0.0.1";
}

export type JsonBodyParseResult =
  { ok: true; data: unknown } | { ok: false; response: NextResponse };

/**
 * Parses a JSON request body while strictly bounding byte length before JSON.parse.
 */
export async function parseJsonBodyWithLimit(
  request: NextRequest,
  maxBytes = DEFAULT_MAX_JSON_BYTES,
): Promise<JsonBodyParseResult> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return {
        ok: false,
        response: applyApiSecurityHeaders(
          NextResponse.json(
            {
              error: "Payload Too Large",
              message: `Request body exceeds maximum size of ${maxBytes} bytes.`,
            },
            { status: 413 },
          ),
        ),
      };
    }
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return {
      ok: false,
      response: applyApiSecurityHeaders(
        NextResponse.json(
          { error: "Bad Request", message: "Unable to read request body." },
          { status: 400 },
        ),
      ),
    };
  }

  if (Buffer.byteLength(rawText, "utf8") > maxBytes) {
    return {
      ok: false,
      response: applyApiSecurityHeaders(
        NextResponse.json(
          {
            error: "Payload Too Large",
            message: `Request body exceeds maximum size of ${maxBytes} bytes.`,
          },
          { status: 413 },
        ),
      ),
    };
  }

  try {
    return { ok: true, data: JSON.parse(rawText) as unknown };
  } catch {
    return {
      ok: false,
      response: applyApiSecurityHeaders(
        NextResponse.json(
          { error: "Bad Request", message: "Invalid JSON request payload." },
          { status: 400 },
        ),
      ),
    };
  }
}

export interface GuardedApiContext {
  request: NextRequest;
  clientIp: string;
  rateLimit: RateLimitResult;
  rateLimitHeaders: Record<string, string>;
}

/**
 * Wraps API route execution with rate limiting, metric recording, security headers,
 * and sanitized 500 error responses (never exposing raw error messages or URLs).
 */
export async function handleGuardedApiRoute(
  route: MonitoredRoute,
  request: NextRequest,
  handler: (ctx: GuardedApiContext) => Promise<NextResponse>,
  options: { skipRateLimit?: boolean } = {},
): Promise<NextResponse> {
  const startedAt = Date.now();
  const clientIp = extractTrustedClientIp(request);

  const rateLimit: RateLimitResult = options.skipRateLimit
    ? { allowed: true, limit: 0, remaining: 0, resetSeconds: 0 }
    : globalRateLimiter.check(clientIp);

  if (!rateLimit.allowed) {
    const blocked = applyApiSecurityHeaders(
      NextResponse.json(
        {
          error: "Too Many Requests",
          message: "Sliding-window rate limit exceeded. Please throttle requests.",
          limit: rateLimit.limit,
          retryAfterSeconds: rateLimit.resetSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.resetSeconds.toString(),
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        },
      ),
    );
    recordRouteMetric(route, 429, Date.now() - startedAt);
    return blocked;
  }

  const rateLimitHeaders: Record<string, string> = options.skipRateLimit
    ? {}
    : {
        "X-RateLimit-Limit": rateLimit.limit.toString(),
        "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      };

  try {
    const response = await handler({
      request,
      clientIp,
      rateLimit,
      rateLimitHeaders,
    });
    const secured = applyApiSecurityHeaders(response);
    recordRouteMetric(route, secured.status, Date.now() - startedAt);
    return secured;
  } catch (error: unknown) {
    const rawDetail = error instanceof Error ? error.message : String(error);
    console.error(`[API:${route}] Internal error:`, redactSecrets(rawDetail));

    const serverError = applyApiSecurityHeaders(
      NextResponse.json(
        {
          error: "Internal Server Error",
          message: "An unexpected internal error occurred.",
        },
        { status: 500 },
      ),
    );
    recordRouteMetric(route, 500, Date.now() - startedAt);
    return serverError;
  }
}
