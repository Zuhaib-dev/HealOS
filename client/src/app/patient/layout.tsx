import { RoleGuard } from "@/components/auth/role-guard";
import { PatientShell } from "@/components/patient/patient-shell";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["PATIENT"]}>
      <PatientShell>
        {children}
      </PatientShell>
    </RoleGuard>
  );
}
