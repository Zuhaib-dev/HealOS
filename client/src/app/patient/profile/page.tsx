import { createPageMetadata } from "@/lib/seo/metadata";
import { ProfilePanel } from "@/components/patient/panels/profile-panel";

export const metadata = createPageMetadata(
  "Patient Profile",
  "Patient Profile workspace in HealOS for hospital care and operations.",
);

export default function ProfilePanelPage() {
  return <ProfilePanel />;
}
