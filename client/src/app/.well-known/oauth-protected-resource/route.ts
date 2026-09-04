import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const protectedResourceMetadata = {
    resource: "https://healos-theta.vercel.app",
    authorization_servers: ["https://healos-theta.vercel.app"],
    scopes_supported: [
      "read:patients",
      "write:patients",
      "read:appointments",
      "write:appointments",
      "read:vitals",
      "write:vitals",
      "read:reports",
      "emergency:triage",
    ],
    bearer_methods_supported: ["header"],
    resource_documentation: "https://healos-theta.vercel.app/developers",
  };

  return NextResponse.json(protectedResourceMetadata, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
