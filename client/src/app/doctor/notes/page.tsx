import { createPageMetadata } from "@/lib/seo/metadata";
import { NotesPanel } from "@/components/doctor/panels/Documentation-panel";

export const metadata = createPageMetadata(
  "Clinical Notes",
  "Clinical Notes workspace in HealOS for hospital care and operations.",
);

export default function NotesPanelPage() {
  return <NotesPanel />;
}
