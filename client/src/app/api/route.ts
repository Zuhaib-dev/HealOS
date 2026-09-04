import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(
    {
      name: "HealOS Healthcare Platform API",
      version: "1.0.0",
      status: "online",
      description: "Autonomous and clinical healthcare management API.",
      documentation: "https://healos-theta.vercel.app/developers",
      openapi: "https://healos-theta.vercel.app/openapi.json",
      mcp: "https://healos-theta.vercel.app/.well-known/mcp",
      endpoints: {
        v1: "https://healos-theta.vercel.app/api/v1",
        health: "https://healos-theta.vercel.app/api/v1/health",
        catalog: "https://healos-theta.vercel.app/api/v1/catalog",
        appointments: "https://healos-theta.vercel.app/api/v1/appointments",
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
