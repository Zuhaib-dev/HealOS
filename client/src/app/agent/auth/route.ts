import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json(
      {
        type: "https://healos-theta.vercel.app/errors/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Bearer token required. See https://healos-theta.vercel.app/auth.md",
      },
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": 'Bearer realm="healos", resource_metadata="https://healos-theta.vercel.app/.well-known/oauth-protected-resource"',
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      token_type: "Bearer",
      expires_in: 3600,
      scope: "read:patients write:appointments read:vitals",
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  return GET(request);
}
