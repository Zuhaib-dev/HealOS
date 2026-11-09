import { createPageMetadata } from "@/lib/seo/metadata";
import { AppointmentsPanel } from "@/components/patient/panels/appointments-panel";

export const metadata = createPageMetadata(
  "My Appointments",
  "My Appointments workspace in HealOS for hospital care and operations.",
);

export default function AppointmentsPanelPage() {
  return <AppointmentsPanel />;
}
