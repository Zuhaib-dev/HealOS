import { createPageMetadata } from "@/lib/seo/metadata";
import { MessagesPanel } from "@/components/patient/panels/messages-panel";

export const metadata = createPageMetadata(
  "Care Team Messages",
  "Care Team Messages workspace in HealOS for hospital care and operations.",
);

export default function MessagesPanelPage() {
  return <MessagesPanel />;
}
