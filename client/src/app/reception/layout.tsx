"use client";

import { UserPlus, Users, Monitor, LayoutDashboard } from "lucide-react";

import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const sections = [
  { id: "overview", label: "Home", shortLabel: "Home", icon: LayoutDashboard },
  {
    id: "new",
    label: "New Patient",
    shortLabel: "Register",
    icon: UserPlus,
  },
  { id: "queue", label: "Queue", shortLabel: "Queue", icon: Users },
  {
    id: "counter",
    label: "Front Counter",
    shortLabel: "Counter",
    icon: Monitor,
  },
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["RECEPTIONIST"]}>
      <WorkspaceShell
        navId="reception"
        breadcrumb="Access & flow / Front desk (OPD)"
        searchPlaceholder="Search MRN, mobile, ABHA"
        sections={sections}
        user={{ name: "Front Desk", role: "Front desk", initials: "FD" }}
        statusTitle="Counter"
        statusLine="Live OPD desk"
        statusNote="Queue and billing update as patients check in"
      >
        {children}
      </WorkspaceShell>
    </RoleGuard>
  );
}
