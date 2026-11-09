import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";
import { RoleGuard } from "@/components/auth/role-guard";
import { RadiologyShell } from "@/components/radiology/radiology-shell";

export const metadata: Metadata = createPageMetadata(
  "Radiology Worklist",
  "Radiology Worklist workspace in HealOS.",
  { noIndex: true },
);

export default function RadiologyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["RADIOLOGIST"]}>
      <RadiologyShell>{children}</RadiologyShell>
    </RoleGuard>
  );
}
