import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(
    {
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
