import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const robotsTxt = `User-agent: GPTBot
Allow: /
Allow: /developers
Allow: /openapi.json
Allow: /llms.txt
Allow: /agents.md
Allow: /auth.md
Allow: /api/v1/
Disallow: /admin/
Disallow: /doctor/
Disallow: /patient/
Disallow: /nurse/
Disallow: /radiology/
Disallow: /emergency/

User-agent: ClaudeBot
Allow: /
Allow: /developers
Allow: /openapi.json
Allow: /llms.txt
Allow: /agents.md
Allow: /auth.md
Allow: /api/v1/
Disallow: /admin/
Disallow: /doctor/
Disallow: /patient/
Disallow: /nurse/
Disallow: /radiology/
Disallow: /emergency/

User-agent: ChatGPT-User
Allow: /
Allow: /developers
Allow: /openapi.json
Allow: /llms.txt
Allow: /agents.md
Allow: /auth.md
Allow: /api/v1/

User-agent: Claude-User
Allow: /
Allow: /developers
Allow: /openapi.json
Allow: /llms.txt
Allow: /agents.md
Allow: /auth.md
Allow: /api/v1/

User-agent: Perplexity-User
Allow: /
Allow: /developers
Allow: /openapi.json
Allow: /llms.txt
Allow: /agents.md
Allow: /auth.md
Allow: /api/v1/

User-agent: ora-agent
Allow: /
Allow: /developers
Allow: /openapi.json
Allow: /llms.txt
Allow: /agents.md
Allow: /auth.md
Allow: /api/v1/

User-agent: Google-Extended
Allow: /
Allow: /developers
Allow: /openapi.json
Allow: /llms.txt
Allow: /agents.md
Allow: /auth.md
Allow: /api/v1/

User-agent: DeepSeekBot
Allow: /
Allow: /developers
Allow: /openapi.json
Allow: /llms.txt
Allow: /agents.md
Allow: /auth.md
Allow: /api/v1/
User-agent: CCBot
Disallow: /

User-agent: ByteSpider
Disallow: /

User-agent: *
Allow: /
Allow: /developers
Allow: /openapi.json
Allow: /llms.txt
Allow: /agents.md
Allow: /auth.md
Allow: /api/v1/
Disallow: /admin/
Disallow: /doctor/
Disallow: /patient/
Disallow: /nurse/
Disallow: /radiology/
Disallow: /emergency/

Sitemap: https://healos-theta.vercel.app/sitemap.xml
schemamap: https://healos-theta.vercel.app/sitemap.xml
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
