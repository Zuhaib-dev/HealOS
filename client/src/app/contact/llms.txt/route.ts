import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const content = `# HealOS Contact & Emergency Directory

- **Lead Developer**: Zuhaib Rashid (Full Stack Developer) - [zuhaibrashid01@gmail.com](mailto:zuhaibrashid01@gmail.com)
- **Developer Support**: [hello@healos.com](mailto:hello@healos.com)
- **Clinical Safety Hotline**: +1 (415) 555-0142
- **Address**: 123 HealOS Ave, San Francisco, CA 94105
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
