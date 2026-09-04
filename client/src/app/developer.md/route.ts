import { GET as getDevMd } from "../developers.md/route";

export const dynamic = "force-static";

export async function GET() {
  return getDevMd();
}
