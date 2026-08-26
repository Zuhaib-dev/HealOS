import { RoleGuard } from "@/components/auth/role-guard";
import { RadiologyShell } from "@/components/radiology/radiology-shell";

export default function RadiologyLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["RADIOLOGIST", "ADMIN"]}>
      <RadiologyShell  >
        {children}
      </RadiologyShell>
    </RoleGuard>
  );
}
