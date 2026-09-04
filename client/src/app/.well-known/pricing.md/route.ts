import { GET as getPricing } from "../../pricing.md/route";

export const dynamic = "force-static";

export async function GET() {
  return getPricing();
}
