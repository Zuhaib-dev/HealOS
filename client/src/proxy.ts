import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  getRoleDashboardPath,
  isPathAllowedForRole,
} from "@/lib/auth-navigation";

const RFC8288_LINK_HEADER =
  '<https://healos-theta.vercel.app/index.md>; rel="alternate"; type="text/markdown", ' +
  '<https://healos-theta.vercel.app/sitemap.xml>; rel="sitemap", ' +
  '<https://healos-theta.vercel.app/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json", ' +
  '<https://healos-theta.vercel.app/.well-known/api-catalog>; rel="api-catalog"';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const acceptHeader = request.headers.get("accept") || "";
  const userAgent = request.headers.get("user-agent") || "";
  const modeParam = request.nextUrl.searchParams.get("mode");

  const isAiBot =
    /GPTBot|ClaudeBot|ChatGPT-User|PerplexityBot|Google-Extended|Applebot-Extended|ora-agent|DeepSeekBot/i.test(
      userAgent,
    );

  const wantsMarkdown =
    acceptHeader.includes("text/markdown") || modeParam === "agent" || isAiBot;

  // Root content negotiation for AI crawlers & markdown probes
  if (pathname === "/" && wantsMarkdown) {
    const rewriteUrl = new URL("/index.md", request.url);
    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set("Content-Type", "text/markdown; charset=utf-8");
    response.headers.set("Vary", "Accept, User-Agent, Accept-Encoding");
    response.headers.set("Link", RFC8288_LINK_HEADER);
    return response;
  }

  const KNOWN_MD_ROUTES = new Set([
    "/index.md",
    "/auth.md",
    "/agents.md",
    "/developers.md",
    "/developer.md",
    "/api.md",
    "/llms.md",
    "/skill.md",
    "/agent.md",
    "/pricing.md",
    "/.well-known/pricing.md",
  ]);

  // Universal markdown fallback for *.md requests (e.g. /.well-known/api-catalog.md, /api/v1/appointments.md)
  if (pathname.endsWith(".md") && !KNOWN_MD_ROUTES.has(pathname)) {
    const fallbackUrl = new URL(
      `/api/markdown-fallback?path=${encodeURIComponent(pathname)}`,
      request.url,
    );
    const response = NextResponse.rewrite(fallbackUrl);
    response.headers.set("Content-Type", "text/markdown; charset=utf-8");
    response.headers.set("Vary", "Accept, User-Agent, Accept-Encoding");
    response.headers.set("Link", RFC8288_LINK_HEADER);
    return response;
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";

  const tokenCookie = request.cookies.get("healos_token")?.value;
  let verifiedRole: string | null = null;
  let hasValidBackendToken = false;

  if (tokenCookie) {
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || "dev-jwt-secret-change-in-production",
      );
      const { payload } = await jwtVerify(tokenCookie, secret);
      if (typeof payload.role === "string") {
        verifiedRole = payload.role;
        hasValidBackendToken = true;
      }
    } catch {
      // Treat expired, malformed, and incorrectly signed tokens as logged out.
    }
  }

  const clearStaleAuthCookies = (response: NextResponse) => {
    if (tokenCookie && !hasValidBackendToken) {
      response.cookies.delete("healos_token");
      response.cookies.delete("healos_role");
    } else if (!tokenCookie && request.cookies.has("healos_role")) {
      response.cookies.delete("healos_role");
    }
    return response;
  };

  // Always let login/register render. The client guard verifies the token
  // against /auth/me before offering an active-session redirect; doing it here
  // would strand users with a signed but revoked JWT (for example after a role
  // change) in a protected-route redirect loop.
  if (isAuthPage) {
    const response = clearStaleAuthCookies(NextResponse.next());
    response.headers.set("Vary", "Accept, User-Agent, Accept-Encoding");
    response.headers.set("Link", RFC8288_LINK_HEADER);
    response.headers.set("Cache-Control", "private, no-store");
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

  // Verify authentication for protected paths
  if (!hasValidBackendToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${request.nextUrl.search}`,
    );
    const response = NextResponse.redirect(loginUrl);
    clearStaleAuthCookies(response);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  // Enforce role workspace boundaries (e.g. ADMIN cannot view /doctor or /patient)
  const roleCookie = verifiedRole || request.cookies.get("healos_role")?.value;
  if (roleCookie) {
    if (!isPathAllowedForRole(pathname, roleCookie)) {
      const correctPath = getRoleDashboardPath(roleCookie);
      const response = NextResponse.redirect(new URL(correctPath, request.url));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }

  const response = NextResponse.next();
  response.headers.set("Vary", "Accept, User-Agent, Accept-Encoding");
  response.headers.set("Link", RFC8288_LINK_HEADER);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
