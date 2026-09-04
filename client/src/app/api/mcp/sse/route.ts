import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    },
  });
}
