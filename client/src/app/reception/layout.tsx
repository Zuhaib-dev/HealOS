"use client";

import { UserPlus, Users, Monitor } from "lucide-react";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const sections = [
  { id: "registration", label: "New Patient", icon: UserPlus },
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
      
      
      user={{ name: user?.name || "Front Desk", role: user?.role || "Front desk", initials: getInitials(user?.name) }}
      statusTitle="Counter"
      statusLine="Counter 2 open"
      statusNote="23 tokens waiting · float balanced"
    >
      {children}
    </WorkspaceShell>
  );
}
