import { GET as getAgentsMd } from "../agents.md/route";

export const dynamic = "force-static";

export async function GET() {
  return getAgentsMd();
}
