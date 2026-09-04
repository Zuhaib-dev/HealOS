import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const content = `---
title: HealOS Developer Documentation
description: Overview of REST API, OpenAPI specifications, and Model Context Protocol tooling
canonical: https://healos-theta.vercel.app/developers.md
last-updated: 2026-09-04
---

# HealOS Developer Documentation

HealOS provides modern REST and Model Context Protocol (MCP) endpoints for hospital systems.

## Resources
- **OpenAPI 3.1.0 Spec**: [https://healos-theta.vercel.app/openapi.json](https://healos-theta.vercel.app/openapi.json)
- **MCP Server**: [https://healos-theta.vercel.app/.well-known/mcp](https://healos-theta.vercel.app/.well-known/mcp)
- **Authentication**: [https://healos-theta.vercel.app/auth.md](https://healos-theta.vercel.app/auth.md)
- **Agent Guide**: [https://healos-theta.vercel.app/agents.md](https://healos-theta.vercel.app/agents.md)
- **Web Portal**: [https://healos-theta.vercel.app/developers](https://healos-theta.vercel.app/developers)
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
