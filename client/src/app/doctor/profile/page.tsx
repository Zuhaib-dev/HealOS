import { createPageMetadata } from "@/lib/seo/metadata";
import { ProfilePanel } from "@/components/doctor/panels/profile-panel";

export const metadata = createPageMetadata(
  "Clinician Profile",
  "Clinician Profile workspace in HealOS for hospital care and operations.",
);

export default function ProfilePanelPage() {
  return <ProfilePanel />;
}
