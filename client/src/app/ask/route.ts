import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function generateAnswer(query: string): { answer: string; sources: Array<{ title: string; url: string }> } {
  const q = query.toLowerCase();

  if (q.includes("appointment") || q.includes("schedule") || q.includes("book")) {
    return {
      answer:
        "HealOS provides comprehensive clinical appointment scheduling. Outpatient visits can be queried at /api/v1/appointments and booked through the Patient Portal, Doctor Shift Board, or programmatic MCP tool 'book_appointment'.",
      sources: [
        { title: "Appointments API", url: "https://healos-theta.vercel.app/api/v1/appointments" },
        { title: "OpenAPI Spec", url: "https://healos-theta.vercel.app/openapi.json" },
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
    };
  }

  if (q.includes("mcp") || q.includes("tool") || q.includes("agent") || q.includes("api")) {
    return {
      answer:
        "HealOS exposes a Model Context Protocol (MCP) server manifest at /.well-known/mcp supporting SSE streaming and tool calling for Claude Desktop and autonomous AI agents. The REST API specification is published at /openapi.json.",
      sources: [
        { title: "Developer Portal", url: "https://healos-theta.vercel.app/developers" },
        { title: "MCP Manifest", url: "https://healos-theta.vercel.app/.well-known/mcp" },
        { title: "Auth Specification", url: "https://healos-theta.vercel.app/auth.md" },
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
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query") || request.nextUrl.searchParams.get("q") || "What is HealOS?";
  const wantsStream = request.nextUrl.searchParams.get("stream") === "true" || request.headers.get("accept")?.includes("text/event-stream");

  if (wantsStream) {
    return streamResponse(query);
  }

  const { answer, sources } = generateAnswer(query);
  return NextResponse.json(
    {
      query,
      answer,
      sources,
      model: "healos-clinical-assistant-1.0",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  let query = "What is HealOS?";
  let wantsStream = request.headers.get("accept")?.includes("text/event-stream");

  try {
    const body = await request.json();
    if (body.query) query = body.query;
    if (body.stream === true) wantsStream = true;
  } catch {
    // Fallback to default query
  }

  if (wantsStream) {
    return streamResponse(query);
  }

  const { answer, sources } = generateAnswer(query);
  return NextResponse.json(
    {
      query,
      answer,
      sources,
      model: "healos-clinical-assistant-1.0",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}

function streamResponse(query: string) {
  const { answer, sources } = generateAnswer(query);
  const words = answer.split(" ");

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < words.length; i++) {
        const textChunk = (i > 0 ? " " : "") + words[i];
        const payload = JSON.stringify({ chunk: textChunk });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        // Minimal delay to simulate streaming
        await new Promise((r) => setTimeout(r, 15));
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sources, done: true })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
