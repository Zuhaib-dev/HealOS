import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const serverCard = {
    name: "HealOS Core MCP Server",
    description: "Model Context Protocol toolsuite for clinical hospital management, patient records, and workflow orchestration.",
    version: "1.0.0",
    serverUrl: "https://healos-theta.vercel.app/.well-known/mcp",
    homepage: "https://healos-theta.vercel.app/developers",
    repository: "https://github.com/Zuhaib-dev/HealOS",
    transport: "sse",
    tools: [
      {
        name: "search_patients",
        description: "Search patient directory by name, MRN, or phone number.",
        parameters: {
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string", description: "Patient name, MRN, or phone" },
          },
        },
      },
      {
        name: "get_patient_vitals",
        description: "Fetch recent telemetry and recorded vital signs for an admitted patient.",
        parameters: {
          type: "object",
          required: ["patientId"],
          properties: {
            patientId: { type: "string", description: "Patient identifier" },
          },
        },
      },
      {
        name: "book_appointment",
        description: "Book an outpatient clinic appointment with a physician.",
        parameters: {
          type: "object",
          required: ["patientId", "doctorId", "date", "reason"],
          properties: {
            patientId: { type: "string" },
            doctorId: { type: "string" },
            date: { type: "string", format: "date-time" },
            reason: { type: "string" },
          },
        },
      },
      {
        name: "get_emergency_triage",
        description: "Inspect active Emergency Department triage board entries and bed capacity.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    ],
  };

  return NextResponse.json(serverCard, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
