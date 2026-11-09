import { createPageMetadata } from "@/lib/seo/metadata";
export const metadata = createPageMetadata(
  "Pharmacy Dashboard",
  "Pharmacy Dashboard workspace in HealOS for hospital care and operations.",
);

export default function PharmacyDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Pharmacy Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Coming soon...</p>
    </div>
  );
}
