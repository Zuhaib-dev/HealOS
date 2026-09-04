import { NextResponse } from "next/server";
import { GET as getApiV1 } from "../api/v1/route";

export const dynamic = "force-dynamic";

export async function GET() {
  return getApiV1();
}
