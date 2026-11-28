/**
 * VayuShield Backend Services
 * Module: httpApiGuard.ts
 *
 * Deep module centralizing HTTP API boundary controls:
 * - Trusted reverse-proxy client IP extraction (bounded rightmost X-Forwarded-For + IP validation)
 * - Bounded sliding-window rate limiting with standard headers
 * - Streaming request body byte-size enforcement prior to JSON parsing
 * - Same-origin / Sec-Fetch-Site CSRF guard for state/cost-bearing POST endpoints
 * - Sanitized HTTP 500 error handling (no raw exception or secret leakage)
 * - RED observability metric recording and API security headers
 */

import { type NextRequest, NextResponse } from "next/server";
import { isIP } from "node:net";
import {
  globalRateLimiter,
  type RateLimitResult,
  type SlidingWindowRateLimiter,
} from "./rateLimiter";
import { applyApiSecurityHeaders } from "./securityHeaders";
import { redactSecrets } from "./resilientHttp";
import { recordRouteMetric, type MonitoredRoute } from "./observability";

export const DEFAULT_MAX_JSON_BYTES = 16 * 1024; // 16 KB
const MAX_XFF_HEADER_LENGTH = 1024;

function resolveTrustedProxyHops(override?: number): number {
  if (override !== undefined && Number.isFinite(override)) {
    return Math.max(1, Math.floor(override));
  }
  const configured = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");
  return Number.isFinite(configured) && configured >= 1 ? Math.floor(configured) : 1;
}

function isValidIpToken(raw: string): boolean {
  const token = raw.trim();
  if (!token || token.length > 45) return false;
  return isIP(token) !== 0;
}

export function isLoopbackIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "::ffff:127.0.0.1"
  );
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

/**
 * Verifies whether a request originated from a genuine loopback client without
 * trusting the rate-limit fallback ("127.0.0.1") when proxy headers are malformed
 * or when a headerless request targets a non-loopback public host.
 */
export function isDirectOrVerifiedLoopback(
  request: NextRequest,
  trustedProxyHops?: number,
): boolean {
  const hops = resolveTrustedProxyHops(trustedProxyHops);

  if (request.headers.has("x-forwarded-for")) {
    const rawXff = request.headers.get("x-forwarded-for") ?? "";
    const trimmedXff = rawXff.trim();
    if (trimmedXff) {
      if (trimmedXff.length > MAX_XFF_HEADER_LENGTH) {
        return false;
      }
      if (request.headers.has("x-real-ip")) {
        const realIp = request.headers.get("x-real-ip")?.trim() ?? "";
        if (!isValidIpToken(realIp) || !isLoopbackIp(realIp)) {
          return false;
        }
      }
      const rawTokens = trimmedXff.split(",").map((part) => part.trim());
      const targetIndex = Math.max(0, rawTokens.length - hops);
      const selected = rawTokens[targetIndex] ?? "";
      return isValidIpToken(selected) && isLoopbackIp(selected);
    }
    if (!request.headers.has("x-real-ip")) {
      return false;
    }
  }

  if (request.headers.has("x-real-ip")) {
    const realIp = (request.headers.get("x-real-ip") ?? "").trim();
    return isValidIpToken(realIp) && isLoopbackIp(realIp);
  }

  const hostHeader = request.headers.get("host")?.trim();
  if (hostHeader) {
    try {
      const hostHostname = new URL(`http://${hostHeader}`).hostname;
      if (!isLoopbackHostname(hostHostname)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return isLoopbackHostname(request.nextUrl.hostname);
}

/**
 * Extracts client IP securely behind trusted reverse proxies (e.g. Google Cloud Run GFE).
 * Bounds X-Forwarded-For length, validates IP syntax, and reads from the RIGHT end so
 * arbitrary leftmost client-spoofed headers cannot bypass per-IP rate limiting.
 */
export function extractTrustedClientIp(
  request: NextRequest,
  trustedProxyHops?: number,
): string {
  const hops = resolveTrustedProxyHops(trustedProxyHops);

  const rawXff = request.headers.get("x-forwarded-for");
  if (rawXff) {
    const boundedXff =
      rawXff.length > MAX_XFF_HEADER_LENGTH
        ? rawXff.slice(-MAX_XFF_HEADER_LENGTH)
        : rawXff;
    const parts = boundedXff
      .split(",")
      .map((part) => part.trim())
      .filter((part) => isValidIpToken(part));

    if (parts.length > 0) {
      const targetIndex = Math.max(0, parts.length - hops);
      const selected = parts[targetIndex];
      if (selected) return selected;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && isValidIpToken(realIp)) return realIp;

  return "127.0.0.1";
}

export type JsonBodyParseResult =
  { ok: true; data: unknown } | { ok: false; response: NextResponse };

function payloadTooLargeResponse(maxBytes: number): NextResponse {
  return applyApiSecurityHeaders(
    NextResponse.json(
      {
        error: "Payload Too Large",
        message: `Request body exceeds maximum size of ${maxBytes} bytes.`,
      },
      { status: 413 },
    ),
  );
}

/**
 * Parses a JSON request body while streaming and strictly bounding byte length
 * prior to buffering or calling JSON.parse (prevents memory exhaustion from chunked streams).
 */
export async function parseJsonBodyWithLimit(
  request: NextRequest,
  maxBytes = DEFAULT_MAX_JSON_BYTES,
): Promise<JsonBodyParseResult> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return { ok: false, response: payloadTooLargeResponse(maxBytes) };
    }
  }

  let rawText = "";
  try {
    if (request.body) {
      const reader = request.body.getReader();
      const decoder = new TextDecoder();
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            await reader.cancel().catch((cancelErr: unknown) => {
              console.warn(
                "[httpApiGuard] Request body cancel failed:",
                redactSecrets(
                  cancelErr instanceof Error ? cancelErr.message : String(cancelErr),
                ),
              );
            });
            return { ok: false, response: payloadTooLargeResponse(maxBytes) };
          }
          rawText += decoder.decode(value, { stream: true });
        }
      }
      rawText += decoder.decode();
    } else {
      rawText = await request.text();
      if (Buffer.byteLength(rawText, "utf8") > maxBytes) {
        return { ok: false, response: payloadTooLargeResponse(maxBytes) };
      }
    }
  } catch (readErr: unknown) {
    console.warn(
      "[httpApiGuard] Failed reading request body:",
      redactSecrets(readErr instanceof Error ? readErr.message : String(readErr)),
    );
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

/**
 * Rejects cross-origin browser POST requests via Sec-Fetch-Site and Origin verification,
 * while remaining compatible with non-browser / headerless API requests.
 */
export function validateSameOriginPost(request: NextRequest): NextResponse | null {
  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase().trim();
  if (secFetchSite === "cross-site") {
    return applyApiSecurityHeaders(
      NextResponse.json(
        { error: "Forbidden", message: "Cross-site POST requests are not permitted." },
        { status: 403 },
      ),
    );
  }

  const origin = request.headers.get("origin")?.trim();
  if (origin) {
    let originUrl: URL;
    try {
      originUrl = new URL(origin);
    } catch {
      return applyApiSecurityHeaders(
        NextResponse.json(
          { error: "Forbidden", message: "Malformed Origin header." },
          { status: 403 },
        ),
      );
    }

    const hostHeader = request.headers.get("host")?.trim();
    const expectedOrigin = hostHeader
      ? `${request.nextUrl.protocol}//${hostHeader}`
      : request.nextUrl.origin;

    if (
      originUrl.origin !== expectedOrigin &&
      originUrl.origin !== request.nextUrl.origin
    ) {
      return applyApiSecurityHeaders(
        NextResponse.json(
          {
            error: "Forbidden",
            message: "Cross-origin POST requests are not permitted.",
          },
          { status: 403 },
        ),
      );
    }
  }

  return null;
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
  options: {
    skipRateLimit?: boolean;
    rateLimiter?: SlidingWindowRateLimiter;
  } = {},
): Promise<NextResponse> {
  const startedAt = Date.now();
  const clientIp = extractTrustedClientIp(request);
  const limiter = options.rateLimiter ?? globalRateLimiter;

  const rateLimit: RateLimitResult = options.skipRateLimit
    ? { allowed: true, limit: 0, remaining: 0, resetSeconds: 0 }
    : limiter.check(clientIp);

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
