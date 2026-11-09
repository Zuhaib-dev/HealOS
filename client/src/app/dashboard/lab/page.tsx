import { createPageMetadata } from "@/lib/seo/metadata";
import { redirect } from "next/navigation";

export const metadata = createPageMetadata(
  "Laboratory Dashboard",
  "Laboratory Dashboard workspace in HealOS for hospital care and operations.",
);

export default function LabDashboard() {
  redirect("/lab");
}
