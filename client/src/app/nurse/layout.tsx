import { ClipboardList, Pill, Bandage, Droplet, Bell, MessagesSquare } from "lucide-react";

import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const sections = [
  { id: "rounds", label: "Rounds", icon: ClipboardList },
  { id: "emar", label: "Meds", icon: Pill },
  { id: "wounds", label: "Wounds", icon: Bandage },
  { id: "fluids", label: "Fluids", icon: Droplet },
  { id: "bells", label: "Bells", icon: Bell },
  { id: "handover", label: "Handover", icon: MessagesSquare },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["NURSE", "ADMIN"]}>
      <WorkspaceShell
        navId="nurse"
        breadcrumb="Ward operations / Nursing station"
        searchPlaceholder="Search bed, MRN, patient"
        sections={sections}
        
        
        statusTitle="Shift"
        statusLine="Day shift · 07:00–19:00"
        statusNote="5 patients · 1 obs overdue · 2 bells waiting"
      >
        {children}
      </WorkspaceShell>
    </RoleGuard>
  );
}
