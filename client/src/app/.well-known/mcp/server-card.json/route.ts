import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const serverCard = {
    name: "HealOS Core MCP Server",
    description: "Model Context Protocol toolsuite for clinical hospital management, patient records, and workflow orchestration.",
    version: "1.0.0",
    serverUrl: "https://healos-theta.vercel.app/.well-known/mcp",
    homepage: "https://healos-theta.vercel.app/developers",
    author: {
      name: "Zuhaib Rashid",
      role: "Full Stack Developer",
      email: "zuhaibrashid01@gmail.com",
      url: "https://zuhaibrashid.com",
    },
    repository: "https://github.com/Zuhaib-dev/HealOS",
    transport: "sse",
    resources: [
      {
        uri: "ui://healos/appointment-booking-form",
        name: "Interactive Appointment Booking Affordance",
        description: "A2UI / MCP App component enabling interactive in-agent clinic booking.",
        mimeType: "text/html",
      },
      {
        uri: "ui://healos/vitals-telemetry-monitor",
        name: "Real-time Telemetry Monitor Component",
        description: "A2UI / MCP App component rendering live patient ECG, SpO2, and BP curves.",
        mimeType: "text/html",
      },
      {
        uri: "ui://healos/emergency-triage-board",
        name: "ED Triage Matrix",
        description: "A2UI interactive triage board view for emergency room staff.",
        mimeType: "text/html",
      },
    ],
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
        _meta: {
          ui: {
            resourceUri: "ui://healos/patient-search-card",
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
        _meta: {
          ui: {
            resourceUri: "ui://healos/vitals-telemetry-monitor",
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
        _meta: {
          ui: {
            resourceUri: "ui://healos/appointment-booking-form",
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
        _meta: {
          ui: {
            resourceUri: "ui://healos/emergency-triage-board",
          },
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
