import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  applyApiSecurityHeaders,
  BASE_SECURITY_HEADERS,
  buildDocumentCsp,
  generateCspNonce,
} from "@/services/securityHeaders";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    return applyApiSecurityHeaders(NextResponse.next());
  }

  const nonce = generateCspNonce();
  const isDev = process.env.NODE_ENV !== "production";
  const cspHeader = buildDocumentCsp(nonce, isDev);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  for (const [header, val] of Object.entries(BASE_SECURITY_HEADERS)) {
    response.headers.set(header, val);
  }
  response.headers.set("Content-Security-Policy", cspHeader);

  return response;
}

export const config = {
  matcher: "/:path*",
};
