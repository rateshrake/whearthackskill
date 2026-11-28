/**
 * VayuShield Backend Services
 * Module: securityHeaders.ts
 *
 * Implements strict Cloud Security and HTTP headers:
 * - Per-request nonce Content-Security-Policy (no 'unsafe-eval' in production)
 * - Strict API CSP for JSON responses
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - Cross-Origin-Opener-Policy / Cross-Origin-Resource-Policy
 * - Referrer-Policy & Permissions-Policy
 */

export const BASE_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

export const API_CSP_POLICY = "default-src 'none'; frame-ancestors 'none';";

export const SECURITY_HEADERS: Record<string, string> = {
  ...BASE_SECURITY_HEADERS,
  "Content-Security-Policy": API_CSP_POLICY,
};

/**
 * Generates a cryptographically strong 128-bit base64 nonce for CSP script-src.
 */
export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Builds the HTML document Content-Security-Policy using a per-request nonce.
 * Production forbids 'unsafe-eval' and 'unsafe-inline' scripts; dev retains 'unsafe-eval'
 * only for Next.js React Refresh / HMR.
 */
export function buildDocumentCsp(nonce: string, isDev = false): string {
  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-eval' 'unsafe-inline'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  const styleSrc = isDev ? "style-src 'self' 'unsafe-inline'" : "style-src 'self'";
  const connectSrc = isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'";

  return [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "img-src 'self' data:",
    "font-src 'self' data:",
    connectSrc,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'none'",
    "media-src 'none'",
    "manifest-src 'self'",
  ].join("; ");
}

/**
 * Injects security headers onto any outgoing HTML or generic Response object.
 */
export function applySecurityHeaders<T extends Response>(
  response: T,
  extraHeaders?: Record<string, string>,
): T {
  const headersToApply = extraHeaders
    ? { ...BASE_SECURITY_HEADERS, ...extraHeaders }
    : SECURITY_HEADERS;
  for (const [header, val] of Object.entries(headersToApply)) {
    response.headers.set(header, val);
  }
  return response;
}

/**
 * Injects strict non-cacheable security headers onto JSON API Response objects.
 */
export function applyApiSecurityHeaders<T extends Response>(response: T): T {
  for (const [header, val] of Object.entries(BASE_SECURITY_HEADERS)) {
    response.headers.set(header, val);
  }
  response.headers.set("Content-Security-Policy", API_CSP_POLICY);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
