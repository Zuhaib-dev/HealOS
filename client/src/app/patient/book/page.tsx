import { createPageMetadata } from "@/lib/seo/metadata";
import { BookPanel } from "@/components/patient/panels/book-panel";

export const metadata = createPageMetadata(
  "Book an Appointment",
  "Book an Appointment workspace in HealOS for hospital care and operations.",
);

export default function BookPanelPage() {
  return <BookPanel />;
}
