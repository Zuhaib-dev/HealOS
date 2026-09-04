import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(
    {
      openapi: "https://healos-theta.vercel.app/openapi.json",
      docs: "https://healos-theta.vercel.app/developers",
      mcp: "https://healos-theta.vercel.app/.well-known/mcp",
      endpoints: [
        {
          path: "/api/v1/health",
          method: "GET",
          operationId: "checkSystemHealth",
          scope: "public",
        },
        {
          path: "/api/v1/appointments",
          method: "GET",
          operationId: "listAppointments",
          scope: "read:appointments",
        },
        {
          path: "/api/v1/appointments",
          method: "POST",
          operationId: "createAppointment",
          scope: "write:appointments",
        },
        {
          path: "/api/v1/patients",
          method: "GET",
          operationId: "listPatients",
          scope: "read:patients",
        },
        {
          path: "/api/v1/emergency/triage",
          method: "GET",
          operationId: "getTriageBoard",
          scope: "read:patients",
        },
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
