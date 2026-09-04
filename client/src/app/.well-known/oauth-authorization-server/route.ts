import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const asMetadata = {
    issuer: "https://healos-theta.vercel.app",
    authorization_endpoint: "https://healos-theta.vercel.app/api/auth/oauth2/authorize",
    token_endpoint: "https://healos-theta.vercel.app/api/auth/oauth2/token",
    registration_endpoint: "https://healos-theta.vercel.app/api/auth/register",
    revocation_endpoint: "https://healos-theta.vercel.app/api/auth/revoke",
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    scopes_supported: [
      "read:patients",
      "write:patients",
      "read:appointments",
      "write:appointments",
      "read:vitals",
      "write:vitals",
      "read:reports",
    ],
    response_types_supported: ["code", "token"],
    service_documentation: "https://healos-theta.vercel.app/auth.md",
    agent_auth: {
      supported: true,
      registration_endpoint: "https://healos-theta.vercel.app/api/auth/register",
      token_endpoint: "https://healos-theta.vercel.app/api/auth/oauth2/token",
      revocation_endpoint: "https://healos-theta.vercel.app/api/auth/revoke",
      grant_types_supported: ["client_credentials", "authorization_code", "urn:ietf:params:oauth:grant-type:token-exchange"],
      registration_template: {
        client_name: "HealOS Autonomous Agent",
        grant_types: ["client_credentials"],
        response_types: ["token"],
        token_endpoint_auth_method: "client_secret_post",
        scope: "read:patients write:appointments read:vitals",
      },
    },
  };

  return NextResponse.json(asMetadata, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
