import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleApiNotFound();
}

export async function POST() {
  return handleApiNotFound();
}

export async function PUT() {
  return handleApiNotFound();
}

export async function DELETE() {
  return handleApiNotFound();
}

export async function PATCH() {
  return handleApiNotFound();
}

function handleApiNotFound() {
  return NextResponse.json(
    {
      error: "Not Found",
      message: "The requested API endpoint does not exist.",
      statusCode: 404,
      documentation: "https://healos-theta.vercel.app/developers",
      openapi: "https://healos-theta.vercel.app/openapi.json",
      catalog: "https://healos-theta.vercel.app/.well-known/api-catalog",
    },
    {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "WWW-Authenticate": 'Bearer realm="HealOS", resource_metadata="https://healos-theta.vercel.app/.well-known/oauth-protected-resource"',
      },
    }
  );
}
