import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
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
      total: sampleAppointments.length,
      page: 1,
      limit: 20,
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.patientId || !body.doctorId || !body.date) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Fields 'patientId', 'doctorId', and 'date' are required.",
          statusCode: 400,
        },
        { status: 400, headers: { "Content-Type": "application/json" } }
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
    };

    return NextResponse.json(created, {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Bad Request",
        message: "Invalid JSON payload",
        statusCode: 400,
      },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
