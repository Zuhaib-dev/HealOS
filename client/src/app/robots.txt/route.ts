import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /doctor/
Disallow: /patient/
Disallow: /nurse/
Disallow: /lab/
Disallow: /pharmacy/
Disallow: /radiology/
Disallow: /reception/
Disallow: /emergency/
Disallow: /dashboard/
Disallow: /onboarding
Disallow: /sandbox
Disallow: /login
Disallow: /register

User-agent: CCBot
Disallow: /

User-agent: ByteSpider
Disallow: /

Sitemap: https://healos-theta.vercel.app/sitemap.xml
`;

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Signals": "search=yes,ai-input=yes,ai-train=no",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
