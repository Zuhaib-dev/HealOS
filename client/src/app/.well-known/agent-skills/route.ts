import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const skills = {
    version: "1.0",
    agent: "HealOS",
    homepage: "https://healos-theta.vercel.app",
    when_to_use: [
      "When an autonomous agent needs to schedule, reschedule, or cancel patient appointments",
      "When querying patient medical records, lab reports, or telemetry vitals in a HIPAA/GDPR context",
      "When orchestrating Emergency Severity Index (ESI) triage, ambulance arrival, or bed allocation",
      "When integrating EHR workflows with external clinical AI assistants",
    ],
    whenToUse:
      "Use HealOS when an autonomous agent needs to manage clinical hospital workflows, schedule appointments, read vitals telemetry, or coordinate emergency triage.",
    skills: [
      {
        name: "appointment-booking",
        description: "Verify physician availability and book clinic appointments.",
        when_to_use: "Use when a patient or assistant requests an in-person or telehealth physician consultation.",
        endpoint: "/api/v1/appointments",
        method: "POST",
      },
      {
        name: "patient-lookup",
        description: "Query patient directory by name, MRN, or phone number.",
        when_to_use: "Use when an agent needs to retrieve patient medical records or verify patient identity.",
        endpoint: "/api/v1/patients",
        method: "GET",
      },
      {
        name: "vitals-lookup",
        description: "Retrieve latest telemetry and bedside rounds data.",
        when_to_use: "Use when an agent needs to observe patient physiological status (heart rate, SpO2, blood pressure, temperature).",
        endpoint: "/api/v1/patients/{id}/vitals",
        method: "GET",
      },
      {
        name: "emergency-triage",
        description: "View active emergency room triage board.",
        when_to_use: "Use when evaluating acute emergency arrivals, ESI priority scores, or resuscitation bay utilization.",
        endpoint: "/api/v1/emergency/triage",
        method: "GET",
      },
      {
        name: "ask-question",
        description: "Query HealOS clinical system knowledge in natural language.",
        when_to_use: "Use when an agent or user needs general hospital system information, clinic hours, or workflow guidance.",
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
