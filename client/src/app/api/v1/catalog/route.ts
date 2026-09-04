import { NextResponse } from "next/server";
import { getStandardApiHeaders } from "@/lib/api-headers";

export const dynamic = "force-dynamic";

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
          path: "/api/v1/jobs",
          method: "POST",
          operationId: "createAsyncJob",
          scope: "write:appointments",
        },
        {
          path: "/api/v1/batch",
          method: "POST",
          operationId: "executeBatchOperations",
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
