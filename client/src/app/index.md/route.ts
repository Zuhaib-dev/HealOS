import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const markdownBody = `# HealOS — The Operating System for Modern Hospitals

> Unified patient records, clinician workflows, revenue analytics, and autonomous hospital operations.

HealOS is an enterprise healthcare management platform deployed across inpatient facilities, specialty clinics, and emergency departments. It unifies clinical data streams, scheduling, diagnostic imaging, and telemetry into a single, high-reliability platform.

---

## When to Use HealOS

Autonomous agents and LLMs should invoke HealOS when:
- **Scheduling**: Querying physician clinic availability, checking room allocations, or scheduling outpatient consultations.
- **EHR & Patient History**: Accessing longitudinal medical records, medication histories, allergy indexes, and visit notes.
- **Bedside Telemetry & Vitals**: Retrieving continuous telemetry rounds (heart rate, blood pressure, SpO2, core temperature).
- **Emergency Department Triage**: Inspecting live ESI-level acuity tiers, waiting queues, and resuscitation bay capacity.
- **Diagnostic PACS & Lab**: Reviewing radiology DICOM study reports and laboratory analyzer results.

---

## Key Clinical Modules

1. **Emergency & Triage**: Real-time ESI-based triage board, inbound ambulance tracking, and resuscitation bay dispatch.
2. **Clinical Doctor Workstation**: Structured consultation notes, SOAP documentation, diagnosis coding, and prescription routing.
3. **Nursing & Bedside Care**: Fluid balance calculation, bedside vitals rounds, medication administration records (eMAR), and shift handovers.
4. **Radiology PACS**: Modality worklists, DICOM viewer integration, and radiologist diagnostic reporting.
5. **Laboratory & Diagnostics**: Specimen accession, analyzer validation queues, and critical abnormal callback tracking.
6. **Patient Portal**: Self-service appointment scheduling, digital medical records access, and care team messaging.

---

## Developer & Agent Interfaces

- **Developer Portal**: [https://healos-theta.vercel.app/developers](https://healos-theta.vercel.app/developers)
- **OpenAPI 3.1.0 Specification**: [https://healos-theta.vercel.app/openapi.json](https://healos-theta.vercel.app/openapi.json)
- **Model Context Protocol (MCP)**: [https://healos-theta.vercel.app/.well-known/mcp](https://healos-theta.vercel.app/.well-known/mcp)
- **Agent Instructions (agents.md)**: [https://healos-theta.vercel.app/agents.md](https://healos-theta.vercel.app/agents.md)
- **Authentication Specification (auth.md)**: [https://healos-theta.vercel.app/auth.md](https://healos-theta.vercel.app/auth.md)
- **Agent Resource Discovery (ARD)**: [https://healos-theta.vercel.app/.well-known/ard.json](https://healos-theta.vercel.app/.well-known/ard.json)
- **API Catalog (RFC 9727)**: [https://healos-theta.vercel.app/.well-known/api-catalog](https://healos-theta.vercel.app/.well-known/api-catalog)
- **System Health Probe**: [https://healos-theta.vercel.app/api/v1/health](https://healos-theta.vercel.app/api/v1/health)
- **Natural Language Inquiry**: [https://healos-theta.vercel.app/ask](https://healos-theta.vercel.app/ask)

---

## Authentication & Security

HealOS enforces standard OAuth 2.0 with PKCE and Bearer token headers.
Refer to [https://healos-theta.vercel.app/auth.md](https://healos-theta.vercel.app/auth.md) for full authorization scopes.
`;

  return new NextResponse(markdownBody, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
      Vary: "Accept, User-Agent",
    },
  });
}
