import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";
import { RoleGuard } from "@/components/auth/role-guard";
import { PatientShell } from "@/components/patient/patient-shell";

export const metadata: Metadata = createPageMetadata(
  "Patient Dashboard",
  "Patient Dashboard workspace in HealOS.",
  { noIndex: true },
);

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["PATIENT"]}>
      <PatientShell>{children}</PatientShell>
    </RoleGuard>
  );
}
