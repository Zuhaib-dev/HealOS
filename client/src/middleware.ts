import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSafeRedirectPath, getRoleDashboardPath, isPathAllowedForRole } from "@/lib/auth-navigation";

const RFC8288_LINK_HEADER =
  '<https://healos-theta.vercel.app/index.md>; rel="alternate"; type="text/markdown", ' +
  '<https://healos-theta.vercel.app/sitemap.xml>; rel="sitemap", ' +
  '<https://healos-theta.vercel.app/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json", ' +
  '<https://healos-theta.vercel.app/.well-known/api-catalog>; rel="api-catalog"';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const acceptHeader = request.headers.get("accept") || "";
  const userAgent = request.headers.get("user-agent") || "";
  const modeParam = request.nextUrl.searchParams.get("mode");

  const isAiBot =
    /GPTBot|ClaudeBot|ChatGPT-User|PerplexityBot|Google-Extended|Applebot-Extended|ora-agent|DeepSeekBot/i.test(
      userAgent
    );

  const wantsMarkdown =
    acceptHeader.includes("text/markdown") ||
    modeParam === "agent" ||
    isAiBot;

  // Root content negotiation for AI crawlers & markdown probes
  if (pathname === "/" && wantsMarkdown) {
    const rewriteUrl = new URL("/index.md", request.url);
    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set("Content-Type", "text/markdown; charset=utf-8");
    response.headers.set("Vary", "Accept, User-Agent, Accept-Encoding");
    response.headers.set("Link", RFC8288_LINK_HEADER);
    return response;
  }

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
    response.headers.set("Vary", "Accept, User-Agent, Accept-Encoding");
    response.headers.set("Link", RFC8288_LINK_HEADER);
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
    response.headers.set("Vary", "Accept, User-Agent, Accept-Encoding");
    response.headers.set("Link", RFC8288_LINK_HEADER);
    return response;
  }

  // Enforce role workspace boundaries (e.g. ADMIN cannot view /doctor or /patient)
  const roleCookie = request.cookies.get("healos_role")?.value;
  if (roleCookie) {
    if (!isPathAllowedForRole(pathname, roleCookie)) {
      const correctPath = getRoleDashboardPath(roleCookie);
      return NextResponse.redirect(new URL(correctPath, request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("Vary", "Accept, User-Agent, Accept-Encoding");
  response.headers.set("Link", RFC8288_LINK_HEADER);
  return response;
}

export const config = {
  matcher: [
    "/",
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
