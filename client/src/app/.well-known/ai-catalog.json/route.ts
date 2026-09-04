import { GET as getArd } from "../ard.json/route";

export const dynamic = "force-static";

export async function GET() {
  return getArd();
}
