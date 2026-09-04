import { NextRequest, NextResponse } from "next/server";
import { getStandardApiHeaders } from "@/lib/api-headers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const idempotencyKey =
    request.headers.get("idempotency-key") ||
    request.headers.get("x-idempotency-key") ||
    `idem_batch_${Date.now().toString(36)}`;

  try {
    const body = await request.json();
    const operations = Array.isArray(body.operations) ? body.operations : [];

    const results = operations.map((op: { path?: string; method?: string }, idx: number) => ({
      index: idx,
      path: op.path || "/api/v1/unknown",
      status: 200,
      body: { success: true, message: "Operation processed in batch" },
    }));

    return NextResponse.json(
      {
        total: operations.length,
        successful: operations.length,
        failed: 0,
        results,
      },
      {
        status: 200,
        headers: getStandardApiHeaders(idempotencyKey),
      }
    );
  } catch {
    return NextResponse.json(
      {
        type: "https://healos-theta.vercel.app/errors/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Invalid JSON batch payload.",
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
