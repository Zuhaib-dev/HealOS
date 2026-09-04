import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "llms.txt");
    const content = await fs.readFile(filePath, "utf-8");
    const frontmatter = `---
title: HealOS Machine-Readable System Directory
description: Index of clinical APIs, MCP tools, and agent instructions for HealOS
canonical: https://healos-theta.vercel.app/llms.md
last-updated: 2026-09-04
---

`;
    return new NextResponse(frontmatter + content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("# HealOS LLM Guide\n\nRefer to https://healos-theta.vercel.app/llms.txt", {
      status: 200,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }
}
