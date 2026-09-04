import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET(request: NextRequest) {
  const wantsMarkdown =
    request.headers.get("accept")?.includes("text/markdown") ||
    request.nextUrl.searchParams.get("mode") === "agent";

  if (wantsMarkdown) {
    const markdown = `# HealOS API Deprecation & Sunset Policy

> Standard: IETF RFC 8594 (Sunset & Deprecation HTTP Headers)  
> Current Stable Version: v1 (/api/v1)  
> Minimum Notice Window: 24 Months  
> Scheduled Sunset Date: 2027-12-31  

## Policy Guarantees
1. **24-Month Advance Notice**: No endpoint or contract will be removed or altered incompatibly without a minimum 24-month advance deprecation notice.
2. **Standard HTTP Headers**: Deprecated endpoints return \`Sunset: Fri, 31 Dec 2027 23:59:59 GMT\` and \`Link: <https://healos-theta.vercel.app/developers#deprecation>; rel="deprecation"\`.
3. **Continuous Support**: Security and critical bug fixes remain supported throughout the deprecation lifecycle.

## Maintained by
- **Author & Architect**: Zuhaib Rashid (Full Stack Developer)
- **Portfolio**: https://zuhaibrashid.com
- **Email**: zuhaibrashid01@gmail.com
- **Repository**: https://github.com/Zuhaib-dev/HealOS
`;

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        Sunset: "Fri, 31 Dec 2027 23:59:59 GMT",
        Link: '<https://healos-theta.vercel.app/developers#deprecation>; rel="deprecation"',
      },
    });
  }

  return NextResponse.json(
    {
      standard: "IETF RFC 8594",
      active_version: "v1",
      path_prefix: "/api/v1",
      guarantee_window_months: 24,
      sunset_date: "2027-12-31T23:59:59Z",
      sunset_header: "Fri, 31 Dec 2027 23:59:59 GMT",
      policy_url: "https://healos-theta.vercel.app/developers#deprecation",
      migration_guide_url: "https://healos-theta.vercel.app/developers",
      openapi_url: "https://healos-theta.vercel.app/openapi.json",
      author: {
        name: "Zuhaib Rashid",
        role: "Full Stack Developer",
        email: "zuhaibrashid01@gmail.com",
        portfolio: "https://zuhaibrashid.com",
      },
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Sunset: "Fri, 31 Dec 2027 23:59:59 GMT",
        Link: '<https://healos-theta.vercel.app/developers#deprecation>; rel="deprecation"',
      },
    }
  );
}
