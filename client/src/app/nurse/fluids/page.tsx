import { createPageMetadata } from "@/lib/seo/metadata";
import { FluidBalancePanel } from "@/components/nurse/panels/fluid-balance-panel";

export const metadata = createPageMetadata(
  "Fluid Balance",
  "Fluid Balance workspace in HealOS for hospital care and operations.",
);

export default function FluidPanelPage() {
  return <FluidBalancePanel />;
}
