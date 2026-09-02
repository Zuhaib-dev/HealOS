import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSafeRedirectPath } from "@/lib/auth-navigation";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === "/login" || pathname === "/register";

  // If visiting login or register while already authenticated
  if (isAuthPage) {
    const roleCookie = request.cookies.get("healos_role")?.value;
    const tokenCookie = request.cookies.get("healos_token")?.value;
    const sessionCookie =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value;

    const hasAuthSession = Boolean(tokenCookie || sessionCookie || roleCookie);
    const isSwitching =
      request.nextUrl.searchParams.get("switch") === "true" ||
      request.nextUrl.searchParams.get("logout") === "true";

    if (hasAuthSession && !isSwitching) {
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
      const targetPath = getSafeRedirectPath(roleCookie, callbackUrl);
      return NextResponse.redirect(new URL(targetPath, request.url));
    }

    const response = NextResponse.next();
    response.headers.set("Vary", "Accept, Accept-Encoding");
    return response;
  }

  // Protected paths that require authentication
  const isProtectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/doctor") ||
    pathname.startsWith("/radiology") ||
    pathname.startsWith("/reception") ||
    pathname.startsWith("/pharmacy") ||
    pathname.startsWith("/nurse") ||
    pathname.startsWith("/emergency") ||
    pathname.startsWith("/lab") ||
    pathname.startsWith("/patient") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/dashboard");

  if (!isProtectedPath) {
    const response = NextResponse.next();
    response.headers.set("Vary", "Accept, Accept-Encoding");
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("Vary", "Accept, Accept-Encoding");
  return response;
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/admin/:path*",
    "/doctor/:path*",
    "/radiology/:path*",
    "/reception/:path*",
    "/pharmacy/:path*",
    "/nurse/:path*",
    "/emergency/:path*",
    "/lab/:path*",
    "/patient/:path*",
    "/onboarding/:path*",
    "/dashboard/:path*",
  ],
};

