import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(
    {
      version: "v1",
      name: "HealOS Core API",
      status: "operational",
      specification: "https://healos-theta.vercel.app/openapi.json",
      documentation: "https://healos-theta.vercel.app/developers",
      endpoints: [
        { path: "/api/v1/health", method: "GET", description: "System health check" },
        { path: "/api/v1/catalog", method: "GET", description: "API directory" },
        { path: "/api/v1/appointments", method: "GET, POST", description: "Clinical appointment management" },
      ],
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
