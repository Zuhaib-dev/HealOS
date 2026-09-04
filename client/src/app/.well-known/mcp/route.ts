import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MCP_MANIFEST = {
  mcpVersion: "1.0.0",
  server: {
    name: "HealOS-Core",
    version: "1.0.0",
    description: "HealOS Hospital Management and Clinical Telemetry MCP Server",
    documentation: "https://healos-theta.vercel.app/developers",
  },
  capabilities: {
    tools: {
      supported: true,
      listUrl: "https://healos-theta.vercel.app/.well-known/mcp",
    },
    resources: {
      supported: true,
      listUrl: "https://healos-theta.vercel.app/.well-known/mcp",
    },
    prompts: {
      supported: true,
    },
    logging: {
      supported: true,
    },
  },
  connection: {
    type: "sse",
    url: "https://healos-theta.vercel.app/api/mcp/sse",
  },
  tools: [
    {
      name: "search_patients",
      description: "Search the HealOS Master Patient Index (MPI) by name, MRN, or telephone number.",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Patient name, Medical Record Number (MRN), or phone number" },
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
      description: "Retrieve real-time telemetry and bedside observations (heart rate, blood pressure, SpO2, temperature).",
      parameters: {
        type: "object",
        required: ["patientId"],
        properties: {
          patientId: { type: "string", description: "Unique patient identifier" },
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
      description: "Schedule an outpatient consultation with a physician or specialist clinic.",
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
      description: "Inspect the active Emergency Department triage board, ESI level breakdown, and resuscitation bays.",
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
};

export async function GET() {
  return NextResponse.json(MCP_MANIFEST, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.method === "tools/list") {
      return NextResponse.json({ tools: MCP_MANIFEST.tools }, { status: 200 });
    }
    if (body.method === "resources/list") {
      return NextResponse.json({ resources: MCP_MANIFEST.resources }, { status: 200 });
    }
  } catch {
    // Return full manifest
  }

  return NextResponse.json(MCP_MANIFEST, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
