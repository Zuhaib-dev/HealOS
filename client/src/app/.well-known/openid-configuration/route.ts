import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const openIdConfig = {
    issuer: "https://healos-theta.vercel.app",
    authorization_endpoint: "https://healos-theta.vercel.app/api/auth/oauth2/authorize",
    token_endpoint: "https://healos-theta.vercel.app/api/auth/oauth2/token",
    userinfo_endpoint: "https://healos-theta.vercel.app/api/auth/oauth2/userinfo",
    jwks_uri: "https://healos-theta.vercel.app/.well-known/jwks.json",
    scopes_supported: [
      "openid",
      "profile",
      "email",
      "read:patients",
      "write:patients",
      "read:appointments",
      "write:appointments",
      "read:vitals",
      "write:vitals",
      "read:reports",
    ],
    response_types_supported: ["code", "token", "id_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    claims_supported: ["sub", "aud", "exp", "iat", "iss", "name", "email", "role", "organizationId"],
    code_challenge_methods_supported: ["S256"],
    service_documentation: "https://healos-theta.vercel.app/developers",
  };

  return NextResponse.json(openIdConfig, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
