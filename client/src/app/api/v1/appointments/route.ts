import { NextRequest, NextResponse } from "next/server";
import { getStandardApiHeaders } from "@/lib/api-headers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);

  const sampleAppointments = [
    {
      id: "apt_101",
      patientId: "pat_882",
      doctorId: "doc_01",
      date: new Date(Date.now() + 86400000).toISOString(),
      status: "CONFIRMED",
      reason: "Cardiology follow-up",
      room: "Consultation Suite 4B",
    },
    {
      id: "apt_102",
      patientId: "pat_914",
      doctorId: "doc_04",
      date: new Date(Date.now() + 172800000).toISOString(),
      status: "SCHEDULED",
      reason: "Orthopedic post-op check",
      room: "Clinic Room 12",
    },
  ];

  return NextResponse.json(
    {
      data: sampleAppointments,
      pagination: {
        cursor: cursor ? `cur_next_${Date.now()}` : "cur_initial_01",
        next_cursor: null,
        has_more: false,
        limit,
        total: sampleAppointments.length,
      },
    },
    {
      status: 200,
      headers: getStandardApiHeaders(),
    }
  );
}

export async function POST(request: NextRequest) {
  const idempotencyKey =
    request.headers.get("idempotency-key") ||
    request.headers.get("x-idempotency-key") ||
    `idem_${Date.now().toString(36)}`;

  try {
    const body = await request.json();
    if (!body.patientId || !body.doctorId || !body.date) {
      return NextResponse.json(
        {
          type: "https://healos-theta.vercel.app/errors/bad-request",
          title: "Bad Request",
          status: 400,
          detail: "Fields 'patientId', 'doctorId', and 'date' are required.",
          instance: "/api/v1/appointments",
        },
        {
          status: 400,
          headers: getStandardApiHeaders(idempotencyKey),
        }
      );
    }

    const created = {
      id: `apt_${Date.now().toString(36)}`,
      patientId: body.patientId,
      doctorId: body.doctorId,
      date: body.date,
      status: "CONFIRMED",
      reason: body.reason || "Outpatient Consultation",
      room: "Assigned upon check-in",
      idempotencyKey,
    };

    return NextResponse.json(created, {
      status: 201,
      headers: getStandardApiHeaders(idempotencyKey),
    });
  } catch {
    return NextResponse.json(
      {
        type: "https://healos-theta.vercel.app/errors/bad-request",
        title: "Bad Request",
        status: 400,
        detail: "Invalid JSON payload.",
        instance: "/api/v1/appointments",
      },
      {
        status: 400,
        headers: getStandardApiHeaders(idempotencyKey),
      }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const idempotencyKey = request.headers.get("idempotency-key");
  return new NextResponse(null, {
    status: 204,
    headers: getStandardApiHeaders(idempotencyKey),
  });
}
