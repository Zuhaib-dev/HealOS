import { createPageMetadata } from "@/lib/seo/metadata";
export const metadata = createPageMetadata(
  "Nursing Dashboard",
  "Nursing Dashboard workspace in HealOS for hospital care and operations.",
);

export default function NurseDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Nurse Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Coming soon...</p>
    </div>
  );
}
