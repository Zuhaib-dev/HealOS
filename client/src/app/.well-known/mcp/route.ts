import { NextResponse } from 'next/server';

export async function GET() {
  // Model Context Protocol (MCP) Manifest
  // Provides information for AI Agents connecting to the HealOS system.
  return NextResponse.json({
    mcpVersion: "1.0.0",
    server: {
      name: "HealOS-Core",
      version: "1.0.0",
      description: "HealOS Hospital Management API for AI Agents",
    },
    capabilities: {
      tools: {
        supported: true,
        listUrl: "/api/mcp/tools", // Placeholder for actual tools endpoint
      },
      resources: {
        supported: false,
      },
      prompts: {
        supported: true,
      },
    },
    connection: {
      type: "sse",
      url: "https://healos-theta.vercel.app/api/mcp/sse",
    },
  }, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    }
  });
}
