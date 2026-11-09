import { createPageMetadata } from "@/lib/seo/metadata";
import { RegistrationPanel } from "@/components/reception/registration-panel";

export const metadata = createPageMetadata(
  "Patient Registration",
  "Patient Registration workspace in HealOS for hospital care and operations.",
);

export default function RegistrationPanelPage() {
  return <RegistrationPanel />;
}
