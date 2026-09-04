import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const content = `# HealOS API Reference

Base URL: \`https://healos-theta.vercel.app/api/v1\`

## Key Endpoints
- \`GET /health\`: System health check
- \`GET /catalog\`: Machine-readable API directory
- \`GET /appointments\`: Query clinical appointments
- \`POST /appointments\`: Schedule an appointment
- \`GET /patients\`: Search patient directory
- \`GET /emergency/triage\`: Query Emergency Department triage board

## Specification & Manifests
- OpenAPI: [https://healos-theta.vercel.app/openapi.json](https://healos-theta.vercel.app/openapi.json)
- MCP Server: [https://healos-theta.vercel.app/.well-known/mcp](https://healos-theta.vercel.app/.well-known/mcp)
- Auth: [https://healos-theta.vercel.app/auth.md](https://healos-theta.vercel.app/auth.md)
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
