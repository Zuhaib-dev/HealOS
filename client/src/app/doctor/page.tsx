import { createPageMetadata } from "@/lib/seo/metadata";
import { ShiftPanel } from "@/components/doctor/panels/Shift-board-panel";

export const metadata = createPageMetadata(
  "Doctor Dashboard",
  "Doctor Dashboard workspace in HealOS for hospital care and operations.",
);

export default function ShiftPanelPage() {
  return <ShiftPanel />;
}
