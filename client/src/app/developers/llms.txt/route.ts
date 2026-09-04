import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const content = `# HealOS Developers & API Directory

> Technical integration guides, OpenAPI schemas, MCP tooling, and authentication protocols.

## Core Developer Endpoints
- **OpenAPI 3.1 Specification**: [https://healos-theta.vercel.app/openapi.json](https://healos-theta.vercel.app/openapi.json)
- **Model Context Protocol**: [https://healos-theta.vercel.app/.well-known/mcp](https://healos-theta.vercel.app/.well-known/mcp)
- **Protected Resource Metadata (RFC 9728)**: [https://healos-theta.vercel.app/.well-known/oauth-protected-resource](https://healos-theta.vercel.app/.well-known/oauth-protected-resource)
- **API Catalog (RFC 9727)**: [https://healos-theta.vercel.app/.well-known/api-catalog](https://healos-theta.vercel.app/.well-known/api-catalog)
- **Authentication Handbook**: [https://healos-theta.vercel.app/auth.md](https://healos-theta.vercel.app/auth.md)
- **Agent Sandbox Token**: [https://healos-theta.vercel.app/api/v1/sandbox](https://healos-theta.vercel.app/api/v1/sandbox)
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
