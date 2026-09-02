"use client";

import { LayoutDashboard, Users, Activity, Siren, Ambulance } from "lucide-react";

import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const sections = [
  { id: "board", label: "ER Board", icon: LayoutDashboard },
  { id: "triage", label: "Triage", icon: Users },
  { id: "resus", label: "Resus Bay", icon: Activity },
  { id: "incident", label: "Mass Cas/Incident", icon: Siren },
  { id: "inbound", label: "Inbound EMS", icon: Ambulance },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["EMERGENCY_DOCTOR"]}>
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
