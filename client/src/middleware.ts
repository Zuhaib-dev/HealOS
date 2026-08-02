import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protected paths that require authentication
  const isProtectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/doctor") ||
    pathname.startsWith("/radiology") ||
    pathname.startsWith("/reception") ||
    pathname.startsWith("/pharmacy") ||
    pathname.startsWith("/nurse") ||
    pathname.startsWith("/patient") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/dashboard");

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/doctor/:path*",
    "/radiology/:path*",
    "/reception/:path*",
    "/pharmacy/:path*",
    "/nurse/:path*",
    "/patient/:path*",
    "/onboarding/:path*",
    "/dashboard/:path*",
  ],
};
