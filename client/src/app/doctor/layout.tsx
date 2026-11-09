import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";
import { RoleGuard } from "@/components/auth/role-guard";
import { DoctorShell } from "@/components/doctor/doctor-shell";

export const metadata: Metadata = createPageMetadata(
  "Doctor Dashboard",
  "Doctor Dashboard workspace in HealOS.",
  { noIndex: true },
);

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["DOCTOR"]}>
      <DoctorShell>{children}</DoctorShell>
    </RoleGuard>
  );
}
