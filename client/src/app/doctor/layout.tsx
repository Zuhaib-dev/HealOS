import { RoleGuard } from "@/components/auth/role-guard";
import { DoctorShell } from "@/components/doctor/doctor-shell";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["DOCTOR"]}>
      <DoctorShell>
        {children}
      </DoctorShell>
    </RoleGuard>
  );
}
