import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function generateAnswer(query: string): {
  answer: string;
  sources: Array<{ title: string; url: string }>;
  follow_ups: string[];
} {
  const q = query.toLowerCase();

  if (q.includes("appointment") || q.includes("schedule") || q.includes("book")) {
    return {
      answer:
        "HealOS provides comprehensive clinical appointment scheduling. Outpatient visits can be queried at /api/v1/appointments and booked through the Patient Portal, Doctor Shift Board, or programmatic MCP tool 'book_appointment'.",
      sources: [
        { title: "Appointments API", url: "https://healos-theta.vercel.app/api/v1/appointments" },
        { title: "OpenAPI Spec", url: "https://healos-theta.vercel.app/openapi.json" },
      ],
      follow_ups: [
        "How do I book an appointment via the REST API?",
        "What doctor specialties are available in HealOS?",
        "How do I check clinic room availability?",
      ],
    };
  }

  if (q.includes("emergency") || q.includes("triage") || q.includes("esi")) {
    return {
      answer:
        "The HealOS Emergency Department module provides an automated live triage board sorting incoming patients by Emergency Severity Index (ESI 1-5), ambulance inbound feeds, and real-time resuscitation bay allocation.",
      sources: [
        { title: "Emergency Triage Board", url: "https://healos-theta.vercel.app/emergency/board" },
        { title: "Agent Operations Manual", url: "https://healos-theta.vercel.app/agents.md" },
      ],
      follow_ups: [
        "How does ESI acuity scoring work in HealOS?",
        "How are resuscitation bays allocated?",
        "Where can I view active ambulance inbound status?",
      ],
    };
  }

  if (q.includes("mcp") || q.includes("tool") || q.includes("agent") || q.includes("api")) {
    return {
      answer:
        "HealOS exposes a Model Context Protocol (MCP) server manifest at /.well-known/mcp supporting SSE streaming, A2UI generative UI resources (ui://), and tool calling for Claude Desktop and autonomous AI agents. The REST API specification is published at /openapi.json.",
      sources: [
        { title: "Developer Portal", url: "https://healos-theta.vercel.app/developers" },
        { title: "MCP Manifest", url: "https://healos-theta.vercel.app/.well-known/mcp" },
        { title: "Auth Specification", url: "https://healos-theta.vercel.app/auth.md" },
      ],
      follow_ups: [
        "How do I configure Claude Desktop with HealOS MCP?",
        "What are the supported OAuth 2.0 scopes?",
        "How can an agent obtain an instant sandbox token?",
      ],
    };
  }

  return {
    answer:
      "HealOS is the operating system for modern hospitals. It unifies clinical scheduling, bedside vitals telemetry, longitudinal patient EHR records, radiology PACS worklists, laboratory analyzer queues, and emergency department triage into a seamless, high-reliability platform.",
    sources: [
      { title: "HealOS Overview", url: "https://healos-theta.vercel.app" },
      { title: "Developer Portal", url: "https://healos-theta.vercel.app/developers" },
      { title: "OpenAPI Spec", url: "https://healos-theta.vercel.app/openapi.json" },
    ],
    follow_ups: [
      "How do I access patient vitals telemetry?",
      "Where is the emergency triage board?",
      "How to connect an autonomous AI agent to HealOS?",
    ],
  };
}

export async function GET(request: NextRequest) {
  const query =
    request.nextUrl.searchParams.get("query") ||
    request.nextUrl.searchParams.get("question") ||
    request.nextUrl.searchParams.get("prompt") ||
    request.nextUrl.searchParams.get("q") ||
    request.nextUrl.searchParams.get("message") ||
    "What is HealOS?";
  const wantsStream =
    request.nextUrl.searchParams.get("stream") === "true" ||
    request.headers.get("accept")?.includes("text/event-stream");

  if (wantsStream) {
    return streamResponse(query);
  }

  const { answer, sources, follow_ups } = generateAnswer(query);
  return NextResponse.json(
    {
      query,
      answer,
      sources,
      confidence: 0.98,
      model: "healos-clinical-assistant-1.0",
      timestamp: new Date().toISOString(),
      follow_ups,
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  let query =
    request.nextUrl.searchParams.get("query") ||
    request.nextUrl.searchParams.get("question") ||
    request.nextUrl.searchParams.get("prompt") ||
    request.nextUrl.searchParams.get("q") ||
    "What is HealOS?";
  let wantsStream =
    request.nextUrl.searchParams.get("stream") === "true" ||
    request.headers.get("accept")?.includes("text/event-stream");

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      if (body.query) query = body.query;
      else if (body.question) query = body.question;
      else if (body.prompt) query = body.prompt;
      else if (body.message) query = body.message;
      else if (Array.isArray(body.messages) && body.messages.length > 0) {
        const last = body.messages[body.messages.length - 1];
        if (typeof last === "string") query = last;
        else if (last?.content) query = last.content;
      }
      if (body.stream === true) wantsStream = true;
    } else if (contentType.includes("text/plain")) {
      const text = await request.text();
      if (text.trim()) query = text.trim();
    }
  } catch {
    // Fallback to query
  }

  if (wantsStream) {
    return streamResponse(query);
  }

  const { answer, sources, follow_ups } = generateAnswer(query);
  return NextResponse.json(
    {
      query,
      answer,
      sources,
      confidence: 0.98,
      model: "healos-clinical-assistant-1.0",
      timestamp: new Date().toISOString(),
      follow_ups,
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    },
  });
}

function streamResponse(query: string) {
  const { answer, sources, follow_ups } = generateAnswer(query);
  const words = answer.split(" ");

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`event: meta\ndata: ${JSON.stringify({ query, model: "healos-clinical-assistant-1.0", sources, follow_ups })}\n\n`)
      );

      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? "" : " ") + words[i];
        controller.enqueue(
          encoder.encode(`event: message\ndata: ${JSON.stringify({ text: chunk, index: i })}\n\n`)
        );
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      controller.enqueue(
        encoder.encode(`event: done\ndata: ${JSON.stringify({ status: "completed", timestamp: new Date().toISOString() })}\n\n`)
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
