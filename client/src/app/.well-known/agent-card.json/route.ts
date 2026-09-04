import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const agentCard = {
    schema_version: "1.0",
    name: "HealOS Autonomous Clinical Agent",
    description: "Hospital workflow agent capable of checking appointment slots, querying EHR data, and monitoring triage queues.",
    url: "https://healos-theta.vercel.app",
    provider: {
      name: "HealOS",
      url: "https://healos-theta.vercel.app",
    },
    author: {
      name: "Zuhaib Rashid",
      role: "Full Stack Developer",
      email: "zuhaibrashid01@gmail.com",
      url: "https://zuhaibrashid.com",
    },
    version: "1.0.0",
    capabilities: {
      natural_language: true,
      streaming: true,
      tools: true,
    },
    skills: [
      {
        id: "clinical_scheduling",
        name: "Appointment Scheduling",
        description: "Checks provider schedules, prevents double-booking, and reserves clinic visit slots.",
      },
      {
        id: "patient_inquiry",
        name: "Patient Demographic and EHR Lookup",
        description: "Retrieves patient histories, allergy alerts, and active medication lists.",
      },
      {
        id: "vitals_monitoring",
        name: "Vitals Observation",
        description: "Accesses physiological telemetry rounds and flags critical deviations.",
      },
      {
        id: "emergency_triage",
        name: "Emergency Triage Board",
        description: "Inspects Emergency Severity Index (ESI) levels and resus bay allocation.",
      },
    ],
    endpoints: {
      ask: "https://healos-theta.vercel.app/ask",
      mcp: "https://healos-theta.vercel.app/.well-known/mcp",
      openapi: "https://healos-theta.vercel.app/openapi.json",
      docs: "https://healos-theta.vercel.app/developers",
    },
  };

  return NextResponse.json(agentCard, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
