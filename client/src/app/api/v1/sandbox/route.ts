import { NextResponse } from "next/server";
import { getStandardApiHeaders } from "@/lib/api-headers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      environment: "sandbox",
      free_tier: true,
      sandbox_token: "healos_test_token_agent_eval_sandbox",
      token_type: "Bearer",
      expires_in: 86400,
      scope: "read:patients write:appointments read:vitals",
      rate_limit: "1000 requests/day",
      docs: "https://healos-theta.vercel.app/developers",
      message: "Zero-friction agent testing sandbox active. No credit card or registration required.",
    },
    {
      status: 200,
      headers: getStandardApiHeaders(),
    }
  );
}

export async function POST() {
  return GET();
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getStandardApiHeaders(),
  });
}
