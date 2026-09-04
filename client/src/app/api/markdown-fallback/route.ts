import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const reqPath = request.nextUrl.searchParams.get("path") || request.nextUrl.pathname;
  const cleanPath = reqPath.replace(/\.md$/, "");
  const pageTitle = cleanPath
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/-/g, " ")
    ?.replace(/\b\w/g, (c) => c.toUpperCase()) || "Resource";

  const markdownContent = `---
title: HealOS — ${pageTitle}
description: Markdown documentation and resource twin for ${cleanPath}
canonical: https://healos-theta.vercel.app${reqPath}
last-updated: 2026-09-04
---

# HealOS: ${pageTitle}

This is the canonical markdown twin for \`${cleanPath}\`.

## Resource Overview
- **Path**: \`${cleanPath}\`
- **Specification**: [https://healos-theta.vercel.app/openapi.json](https://healos-theta.vercel.app/openapi.json)
- **Developer Portal**: [https://healos-theta.vercel.app/developers](https://healos-theta.vercel.app/developers)
- **Authentication**: [https://healos-theta.vercel.app/auth.md](https://healos-theta.vercel.app/auth.md)
- **Agent Guide**: [https://healos-theta.vercel.app/agents.md](https://healos-theta.vercel.app/agents.md)

## Machine-Readable Endpoints
- JSON Representation: \`https://healos-theta.vercel.app${cleanPath}\`
- MCP Server: \`https://healos-theta.vercel.app/.well-known/mcp\`
- Health Check: \`https://healos-theta.vercel.app/api/v1/health\`

---
*HealOS Autonomous Hospital Operating System*
`;

  return new NextResponse(markdownContent, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
