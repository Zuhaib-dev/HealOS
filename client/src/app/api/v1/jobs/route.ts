import { NextRequest, NextResponse } from "next/server";
import { getStandardApiHeaders } from "@/lib/api-headers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const idempotencyKey =
    request.headers.get("idempotency-key") ||
    request.headers.get("x-idempotency-key") ||
    `idem_job_${Date.now().toString(36)}`;

  try {
    const body = await request.json();
    const jobId = `job_${Date.now().toString(36)}`;

    const responseHeaders = {
      ...getStandardApiHeaders(idempotencyKey),
      Location: `https://healos-theta.vercel.app/api/v1/jobs/${jobId}`,
    };

    return NextResponse.json(
      {
        jobId,
        status: "processing",
        task: body.task || "clinical_batch_processing",
        progress: 0,
        createdAt: new Date().toISOString(),
        estimatedCompletionSeconds: 15,
        statusUrl: `https://healos-theta.vercel.app/api/v1/jobs/${jobId}`,
      },
      {
        status: 202,
        headers: responseHeaders,
      }
    );
  } catch {
    return NextResponse.json(
      {
        type: "https://healos-theta.vercel.app/errors/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Invalid JSON payload for async job.",
      },
      {
        status: 400,
        headers: getStandardApiHeaders(idempotencyKey),
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getStandardApiHeaders(),
  });
}
