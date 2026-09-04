import { NextResponse } from "next/server";

export const dynamic = "force-static";

const PRICING_MD_CONTENT = `# HealOS Pricing & Commercial Plans

---
title: HealOS Pricing & Commercial Subscription Tiers
description: Machine-readable pricing, licensing terms, and agent evaluation tiers for the HealOS Hospital Operating System.
canonical: https://healos-theta.vercel.app/pricing.md
last-updated: 2026-09-04
---

HealOS provides flexible licensing tailored for independent clinics, multi-specialty regional medical centers, and enterprise hospital networks.

---

## Subscription Tiers

### 1. Developer & Agent Evaluation (Free Tier)
- **Price**: $0 / month
- **Target Audience**: AI agents, developer sandboxes, open-source researchers.
- **Includes**:
  - Full access to sandbox hospital environment (\`https://healos-theta.vercel.app/api/v1/sandbox\`)
  - 1,000 API requests / day
  - Model Context Protocol (MCP) tool calling enabled
  - Simulated bedside vitals telemetry, emergency triage board, and outpatient appointments
  - Public community support

### 2. Clinical Practice (Outpatient & Specialty Clinics)
- **Price**: $299 / facility / month
- **Target Audience**: Independent physician practices, ambulatory clinics, diagnostic centers.
- **Includes**:
  - Up to 15 clinician / nurse seats
  - Longitudinal patient EHR records & e-prescribing
  - Real-time appointment scheduling & calendar syncing
  - Unlimited patient portal accounts
  - HIPAA Business Associate Agreement (BAA) included

### 3. Enterprise Hospital Operating System
- **Price**: Custom enterprise quote (Contact sales)
- **Target Audience**: Acute care hospitals, trauma centers, multi-campus healthcare systems.
- **Includes**:
  - Unlimited clinician, nurse, and staff seats
  - Emergency Department automated ESI 1-5 triage board
  - High-acuity ICU bedside vitals telemetry streaming (WebSocket)
  - Radiology PACS modality worklist and DICOM integration
  - Dedicated private MCP agent server deployment
  - 99.99% uptime SLA with 24/7 clinical hotline

---

## Machine-Readable Plan Schema

\`\`\`json
{
  "currency": "USD",
  "plans": [
    {
      "id": "sandbox_free",
      "name": "Developer & Agent Sandbox",
      "price": 0,
      "billing_period": "monthly",
      "rate_limit_per_day": 1000,
      "sandbox_enabled": true,
      "token_endpoint": "https://healos-theta.vercel.app/api/v1/sandbox"
    },
    {
      "id": "clinic_pro",
      "name": "Clinical Practice",
      "price": 299,
      "billing_period": "monthly",
      "clinician_seats": 15
    },
    {
      "id": "hospital_enterprise",
      "name": "Enterprise Hospital System",
      "price": "custom",
      "billing_period": "annual",
      "sla": "99.99%"
    }
  ]
}
\`\`\`

---

## Contact & Procurement

- **Self-Serve Sandbox Token**: [https://healos-theta.vercel.app/api/v1/sandbox](https://healos-theta.vercel.app/api/v1/sandbox)
- **Sales & Procurement Inquiries**: [hello@healos.com](mailto:hello@healos.com)
- **Lead Architect**: Zuhaib Rashid (Full Stack Developer) - [zuhaibrashid01@gmail.com](mailto:zuhaibrashid01@gmail.com)
- **Developers Portal**: [https://healos-theta.vercel.app/developers](https://healos-theta.vercel.app/developers)
`;

export async function GET() {
  return new NextResponse(PRICING_MD_CONTENT, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
