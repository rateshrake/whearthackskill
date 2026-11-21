import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applySecurityHeaders } from "@/services/securityHeaders";

export function middleware(_request: NextRequest) {
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: "/:path*",
};
