import { GET as getOpenApi } from "../openapi.json/route";

export const dynamic = "force-static";

export async function GET() {
  return getOpenApi();
}
