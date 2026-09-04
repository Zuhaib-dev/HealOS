import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const plugin = {
    schema_version: "v1",
    name_for_human: "HealOS Healthcare",
    name_for_model: "healos_healthcare",
    description_for_human: "Hospital Operating System for clinical appointments, vitals telemetry, and patient records.",
    description_for_model:
      "Plugin for accessing HealOS Hospital Operating System. Schedule doctor appointments, query patient vitals, review laboratory findings, and interact with hospital triage.",
    auth: {
      type: "oauth",
      client_url: "https://healos-theta.vercel.app/api/auth/oauth2/authorize",
      scope: "read:patients write:appointments read:vitals",
      authorization_url: "https://healos-theta.vercel.app/api/auth/oauth2/token",
      verification_tokens: {
        openai: "healos-agent-verification-token",
      },
    },
    api: {
      type: "openapi",
      url: "https://healos-theta.vercel.app/openapi.json",
    },
    logo_url: "https://healos-theta.vercel.app/icon.svg",
    contact_email: "zuhaibrashid01@gmail.com",
    legal_info_url: "https://healos-theta.vercel.app/about",
  };

  return NextResponse.json(plugin, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
