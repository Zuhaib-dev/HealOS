import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const content = `# About HealOS

> The Operating System for Modern Hospitals.

HealOS provides enterprise clinical software unifying scheduling, bedside telemetry, longitudinal patient records, radiology PACS, and pharmacy management.

## Leadership & Architect
- **Lead Developer**: Zuhaib Rashid
- **Role**: Full Stack Developer & Healthcare Systems Architect
- **Portfolio**: [https://zuhaibrashid.com](https://zuhaibrashid.com)
- **Email**: [zuhaibrashid01@gmail.com](mailto:zuhaibrashid01@gmail.com)
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
