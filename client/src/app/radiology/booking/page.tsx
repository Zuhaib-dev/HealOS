import { createPageMetadata } from "@/lib/seo/metadata";
import { BookingPanel } from "@/components/radiology/radiology-panels";

export const metadata = createPageMetadata(
  "Radiology Booking",
  "Radiology Booking workspace in HealOS for hospital care and operations.",
);

export default function BookingPanelPage() {
  return <BookingPanel />;
}
