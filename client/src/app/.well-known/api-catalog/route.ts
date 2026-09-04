import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const linksetCatalog = {
    linkset: [
      {
        anchor: "https://healos-theta.vercel.app/api/v1",
        "service-desc": [
          {
            href: "https://healos-theta.vercel.app/openapi.json",
            type: "application/vnd.oai.openapi+json",
          },
        ],
        "service-doc": [
          {
            href: "https://healos-theta.vercel.app/developers",
            type: "text/html",
          },
        ],
        status: [
          {
            href: "https://healos-theta.vercel.app/api/v1/health",
            type: "application/json",
          },
        ],
        item: [
          {
            href: "https://healos-theta.vercel.app/api/v1/appointments",
            title: "Appointments API",
            type: "application/json",
          },
          {
            href: "https://healos-theta.vercel.app/api/v1/patients",
            title: "Patients API",
            type: "application/json",
          },
          {
            href: "https://healos-theta.vercel.app/.well-known/mcp",
            title: "Model Context Protocol Endpoint",
            type: "application/json",
          },
        ],
      },
    ],
  };

  return NextResponse.json(linksetCatalog, {
    status: 200,
    headers: {
      "Content-Type": "application/linkset+json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
