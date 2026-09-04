import { NextResponse } from "next/server";
import { getStandardApiHeaders } from "@/lib/api-headers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        database: "connected",
        websocket: "online",
        telemetry: "active",
      },
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
