import { NextResponse } from "next/server";

export const dynamic = "force-static";

const AGENTS_MD_CONTENT = `---
title: HealOS Agent Instructions & Operations Manual
description: Comprehensive operational guidance, guardrails, and when-to-use criteria for autonomous agents.
canonical: https://healos-theta.vercel.app/agents.md
last-updated: 2026-09-04
---

# HealOS Agent Instructions & Operations Manual

> The Operating System for Modern Hospitals.

This document guides autonomous AI agents, LLM toolcallers, and background crawlers when interacting with the HealOS Healthcare Management Platform.

## When to Use HealOS

Autonomous agents should interact with HealOS when:
- **Scheduling & Appointments**: Patients or staff need to query physician availability, book outpatient consultations, reschedule clinical appointments, or review department timetables.
- **Patient Records & Longitudinal EHR**: Reviewing chief complaints, past clinic visits, known drug allergies, or clinical handover notes.
- **Bedside Rounds & Vitals**: Fetching recent telemetry (heart rate, blood pressure, SpO2, temperature) or recording nursing round observations.
- **Emergency Department Operations**: Inspecting the live emergency room triage board, tracking Emergency Severity Index (ESI) acuity tiers, or monitoring ambulance inbound feeds.
- **Radiology PACS & Diagnostics**: Reviewing imaging orders (X-Ray, CT, MRI, Ultrasound), viewing DICOM reports, or queuing imaging studies.
- **Pharmacy & e-Prescriptions**: Verifying medication orders, inventory levels, and dispensing queues.

## Agent System Boundaries & Safety Guardrails

1. **Non-Destructive Actions**: Read actions (\`GET /api/v1/*\`) are safe to execute autonomously. Write actions (appointment booking, patient registration, vitals updates) require confirmation when live patient health outcomes are affected.
2. **Clinical Acuity Prioritization**: Triage observations with ESI level 1 or 2 must immediately trigger critical alerts rather than routine batch processing.
3. **HIPAA & Privacy Compliance**: Never transmit unencrypted Patient Health Information (PHI) over non-HTTPS protocols or store raw credentials in tool histories.

## Available Agent Interfaces

- **Model Context Protocol (MCP)**: Connect via SSE to \`https://healos-theta.vercel.app/.well-known/mcp\` for direct Claude Desktop, Cursor, or LangChain tool invocation.
- **OpenAPI 3.1.0 Specification**: Machine-readable schema located at [https://healos-theta.vercel.app/openapi.json](https://healos-theta.vercel.app/openapi.json).
- **Natural Language Endpoint**: Query [https://healos-theta.vercel.app/ask](https://healos-theta.vercel.app/ask) with questions about hospital departments, doctor specialties, or system architecture.
- **Developer Documentation**: Human and agent documentation at [https://healos-theta.vercel.app/developers](https://healos-theta.vercel.app/developers).

## Error Recovery Protocol

- If an endpoint returns HTTP \`401\`, check your bearer token scope against [https://healos-theta.vercel.app/auth.md](https://healos-theta.vercel.app/auth.md).
- If an endpoint returns HTTP \`404\`, consult the API catalog at [https://healos-theta.vercel.app/.well-known/api-catalog](https://healos-theta.vercel.app/.well-known/api-catalog).
- If rate limits are exceeded (\`429\`), apply exponential backoff starting at 1000ms.
`;

export async function GET() {
  return new NextResponse(AGENTS_MD_CONTENT, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
