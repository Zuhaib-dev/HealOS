import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const skills = {
    version: "1.0",
    agent: "HealOS",
    homepage: "https://healos-theta.vercel.app",
    skills: [
      {
        name: "appointment-booking",
        description: "Verify physician availability and book clinic appointments.",
        endpoint: "/api/v1/appointments",
        method: "POST",
      },
      {
        name: "patient-lookup",
        description: "Query patient directory by name, MRN, or phone number.",
        endpoint: "/api/v1/patients",
        method: "GET",
      },
      {
        name: "vitals-lookup",
        description: "Retrieve latest telemetry and bedside rounds data.",
        endpoint: "/api/v1/patients/{id}/vitals",
        method: "GET",
      },
      {
        name: "emergency-triage",
        description: "View active emergency room triage board.",
        endpoint: "/api/v1/emergency/triage",
        method: "GET",
      },
      {
        name: "ask-question",
        description: "Query HealOS clinical system knowledge in natural language.",
        endpoint: "/ask",
        method: "POST",
      },
    ],
  };

  return NextResponse.json(skills, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
