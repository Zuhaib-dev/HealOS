import { NextResponse } from "next/server";
import { getStandardApiHeaders } from "@/lib/api-headers";

export const dynamic = "force-dynamic";

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
        { path: "/api/v1/jobs", method: "POST", description: "Start asynchronous clinical job" },
        { path: "/api/v1/batch", method: "POST", description: "Execute bulk operations" },
        { path: "/api/v1/sandbox", method: "POST, GET", description: "Instant agent evaluation sandbox key" },
      ],
    },
    {
      status: 200,
      headers: getStandardApiHeaders(),
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getStandardApiHeaders(),
  });
}
