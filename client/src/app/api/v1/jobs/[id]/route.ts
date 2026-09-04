import { NextRequest, NextResponse } from "next/server";
import { getStandardApiHeaders } from "@/lib/api-headers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  return NextResponse.json(
    {
      jobId: id,
      status: "completed",
      progress: 100,
      completedAt: new Date().toISOString(),
      result: {
        recordsProcessed: 42,
        anomaliesDetected: 0,
        status: "success",
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
