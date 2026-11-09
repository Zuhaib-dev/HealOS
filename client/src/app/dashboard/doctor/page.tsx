import { createPageMetadata } from "@/lib/seo/metadata";
export const metadata = createPageMetadata(
  "Doctor Dashboard",
  "Doctor Dashboard workspace in HealOS for hospital care and operations.",
);

export default function DoctorDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Doctor Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Coming soon...</p>
    </div>
  );
}
