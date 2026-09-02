"use client";

import { LayoutDashboard, Users, Activity, Siren, Ambulance } from "lucide-react";

import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const sections = [
  { id: "triage", label: "Triage Board", icon: LayoutDashboard },
  { id: "resus", label: "Resus Bays", icon: Activity },
  { id: "inbound", label: "Inbound EMS", icon: Ambulance },
  { id: "incident", label: "Disaster Mode", icon: Siren },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["EMERGENCY_DOCTOR", "ADMIN", "DOCTOR"]}>
      <WorkspaceShell
        navId="emergency"
        breadcrumb="Urgent care / Emergency department"
        searchPlaceholder="Search ED ID, MRN, complaint"
        sections={sections}
        
        
        statusTitle="Department"
        statusLine="34 in department"
        statusNote="2 resus occupied · 3 ambulances inbound"
      >
        {children}
      </WorkspaceShell>
    </RoleGuard>
  );
}
