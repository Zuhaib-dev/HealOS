import { createPageMetadata } from "@/lib/seo/metadata";
import { WalkInAppointmentsPanel } from "@/components/reception/walk-in-appointments-panel";

export const metadata = createPageMetadata(
  "Walk-in Appointments",
  "Walk-in Appointments workspace in HealOS for hospital care and operations.",
);

export default function WalkInAppointmentsPage() {
  return <WalkInAppointmentsPanel />;
}
