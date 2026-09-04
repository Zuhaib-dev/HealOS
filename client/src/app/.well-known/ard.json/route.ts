import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(
    {
      specVersion: "1.0",
      schema_version: "1.0",
      name: "HealOS",
      description: "Autonomous and clinical healthcare management platform for hospitals and medical centers.",
      homepage_url: "https://healos-theta.vercel.app",
      documentation_url: "https://healos-theta.vercel.app/developers",
      openapi_url: "https://healos-theta.vercel.app/openapi.json",
      mcp_url: "https://healos-theta.vercel.app/.well-known/mcp",
      llms_txt_url: "https://healos-theta.vercel.app/llms.txt",
      agent_instructions_url: "https://healos-theta.vercel.app/agents.md",
      agent_skills_url: "https://healos-theta.vercel.app/.well-known/agent-skills",
      author: {
        name: "Zuhaib Rashid",
        role: "Full Stack Developer",
        email: "zuhaibrashid01@gmail.com",
        portfolio: "https://zuhaibrashid.com",
      },
      entries: [
        {
          id: "healos-rest-api",
          name: "HealOS Clinical REST API",
          type: "api",
          description: "HIPAA-aligned REST API for patient appointments, vitals telemetry, clinical records, and emergency triage.",
          url: "https://healos-theta.vercel.app/api/v1",
          documentationUrl: "https://healos-theta.vercel.app/developers",
          specUrl: "https://healos-theta.vercel.app/openapi.json",
          specType: "openapi",
          auth: {
            type: "oauth2",
            authorizationUrl: "https://healos-theta.vercel.app/api/auth/oauth2/authorize",
            tokenUrl: "https://healos-theta.vercel.app/api/auth/oauth2/token",
            scopes: [
              "read:patients",
              "write:patients",
              "read:appointments",
              "write:appointments",
              "read:vitals",
              "write:vitals",
              "read:reports",
            ],
          },
        },
        {
          id: "healos-mcp-server",
          name: "HealOS Model Context Protocol Server",
          type: "mcp",
          description: "Model Context Protocol server providing live clinical tools, schema reflections, and UI resources for AI agents.",
          url: "https://healos-theta.vercel.app/.well-known/mcp",
          documentationUrl: "https://healos-theta.vercel.app/developers",
          serverCardUrl: "https://healos-theta.vercel.app/.well-known/mcp/server-card.json",
        },
        {
          id: "healos-agent-card",
          name: "HealOS Autonomous Clinical Agent Card",
          type: "agent",
          description: "Agent-to-Agent clinical assistant for autonomous workflow execution and scheduling.",
          url: "https://healos-theta.vercel.app/.well-known/agent-card.json",
          skillsUrl: "https://healos-theta.vercel.app/.well-known/agent-skills",
        },
      ],
      auth: {
        type: "oauth2",
        authorization_url: "https://healos-theta.vercel.app/api/auth/oauth2/authorize",
        token_url: "https://healos-theta.vercel.app/api/auth/oauth2/token",
        scopes: [
          "read:patients",
          "write:patients",
          "read:appointments",
          "write:appointments",
          "read:vitals",
          "write:vitals",
          "read:reports",
        ],
      },
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
