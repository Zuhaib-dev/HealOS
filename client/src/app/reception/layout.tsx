"use client";

import { UserPlus, Users, Monitor, LayoutDashboard } from "lucide-react";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const sections = [
  { id: "overview", label: "Home", icon: LayoutDashboard },
  { id: "new", label: "New Patient", icon: UserPlus },
  { id: "queue", label: "Waiting Room", icon: Users },
  { id: "counter", label: "Front Counter", icon: Monitor },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceShell
      navId="reception"
      breadcrumb="Access & flow / Front desk (OPD)"
      searchPlaceholder="Search MRN, mobile, ABHA"
      sections={sections}
      
      
      user={{ name: "Front Desk", role: "Front desk", initials: "FD" }}
      statusTitle="Counter"
      statusLine="Counter 2 open"
      statusNote="23 tokens waiting · float balanced"
    >
      {children}
    </WorkspaceShell>
  );
}
