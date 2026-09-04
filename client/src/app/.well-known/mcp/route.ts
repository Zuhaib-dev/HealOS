import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    name: "search_patients",
    description: "Search the HealOS Master Patient Index (MPI) by name, MRN, or telephone number.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Patient name, Medical Record Number (MRN), or phone number" },
      },
    },
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
    inputSchema: {
      type: "object",
      required: ["patientId"],
      properties: {
        patientId: { type: "string", description: "Unique patient identifier" },
      },
    },
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
    inputSchema: {
      type: "object",
      required: ["patientId", "doctorId", "date", "reason"],
      properties: {
        patientId: { type: "string", description: "Patient ID" },
        doctorId: { type: "string", description: "Doctor ID" },
        date: { type: "string", format: "date-time", description: "Appointment ISO timestamp" },
        reason: { type: "string", description: "Clinical reason for consultation" },
      },
    },
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
    inputSchema: {
      type: "object",
      properties: {},
    },
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
];

const RESOURCES = [
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
  {
    uri: "ui://healos/patient-search-card",
    name: "Patient Master Index Card View",
    description: "A2UI interactive patient search card for clinical review.",
    mimeType: "text/html",
  },
];

const MCP_MANIFEST = {
  mcpVersion: "1.0.0",
  server: {
    name: "HealOS-Core",
    version: "1.0.0",
    description: "HealOS Hospital Management and Clinical Telemetry MCP Server",
    documentation: "https://healos-theta.vercel.app/developers",
    author: {
      name: "Zuhaib Rashid (Full Stack Developer)",
      email: "zuhaibrashid01@gmail.com",
      url: "https://zuhaibrashid.com",
    },
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
  tools: TOOLS,
  resources: RESOURCES,
};

export async function GET(request: NextRequest) {
  const wantsSse = request.headers.get("accept")?.includes("text/event-stream");
  if (wantsSse) {
    return handleSse();
  }

  return NextResponse.json(MCP_MANIFEST, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      Sunset: "Fri, 31 Dec 2027 23:59:59 GMT",
      Link: '<https://healos-theta.vercel.app/developers#deprecation>; rel="deprecation"',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = body.id !== undefined ? body.id : 1;
    const method = body.method;

    // Standard MCP JSON-RPC 2.0 Handshake: initialize
    if (method === "initialize") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
              logging: {},
            },
            serverInfo: {
              name: "HealOS-Core",
              version: "1.0.0",
            },
            instructions:
              "HealOS Hospital Management and Clinical Telemetry MCP Server. Exposes clinical tools with A2UI ui:// affordances.",
          },
        },
        { status: 200 }
      );
    }

    // Standard MCP Notification: initialized
    if (method === "notifications/initialized") {
      return new NextResponse(null, { status: 204 });
    }

    // Standard MCP: tools/list
    if (method === "tools/list") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            tools: TOOLS,
          },
        },
        { status: 200 }
      );
    }

    // Standard MCP: resources/list
    if (method === "resources/list") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            resources: RESOURCES,
          },
        },
        { status: 200 }
      );
    }

    // Standard MCP: resources/read
    if (method === "resources/read") {
      const uri = body.params?.uri || "";
      const found = RESOURCES.find((r) => r.uri === uri) || RESOURCES[0];
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            contents: [
              {
                uri: found.uri,
                mimeType: found.mimeType,
                text: `<div class="healos-a2ui" data-resource="${found.uri}"><h3>${found.name}</h3><p>${found.description}</p></div>`,
              },
            ],
          },
        },
        { status: 200 }
      );
    }

    // Standard MCP: tools/call
    if (method === "tools/call") {
      const toolName = body.params?.name;
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "success",
                  tool: toolName,
                  message: `Tool ${toolName} executed successfully in HealOS environment.`,
                  timestamp: new Date().toISOString(),
                }),
              },
            ],
            _meta: {
              ui: {
                resourceUri:
                  toolName === "search_patients"
                    ? "ui://healos/patient-search-card"
                    : toolName === "get_patient_vitals"
                    ? "ui://healos/vitals-telemetry-monitor"
                    : toolName === "book_appointment"
                    ? "ui://healos/appointment-booking-form"
                    : "ui://healos/emergency-triage-board",
              },
            },
          },
        },
        { status: 200 }
      );
    }

    // If a non-standard method or plain probe
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        result: MCP_MANIFEST,
        tools: TOOLS,
        resources: RESOURCES,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(MCP_MANIFEST, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    },
  });
}

function handleSse() {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`event: endpoint\ndata: ${JSON.stringify({ url: "https://healos-theta.vercel.app/.well-known/mcp" })}\n\n`)
      );
      controller.enqueue(
        encoder.encode(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", method: "server/ready", params: { server: "HealOS-Core", version: "1.0.0" } })}\n\n`)
      );
      controller.close();
    },
  });

  return new NextResponse(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
