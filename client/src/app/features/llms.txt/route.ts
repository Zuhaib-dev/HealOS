import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const content = `# HealOS Clinical Features & Capabilities

1. **Emergency & Triage**: Automated ESI 1-5 triage calculation and resus bay allocation.
2. **Clinical Doctor Workstation**: Persistent SOAP progress notes and e-prescribing.
3. **Nursing & Bedside Care**: eMAR, fluid balance, and vital signs rounds.
4. **Radiology PACS**: Worklist integration, modality scheduling, and diagnostic reporting.
5. **Laboratory**: Analyzer validation queues and critical abnormal callbacks.
6. **Patient Portal**: Online booking, records review, and bill pay.
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
