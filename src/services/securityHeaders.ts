/**
 * VayuShield Backend Services
 * Module: securityHeaders.ts
 *
 * Implements strict Cloud Security and HTTP headers for Google Cloud Run:
 * - Content-Security-Policy (CSP)
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy
 */

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

/**
 * Injects security headers onto any outgoing Response object.
 */
export function applySecurityHeaders(response: Response): Response {
  for (const [header, val] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, val);
  }
  return response;
}
