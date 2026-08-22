"use client";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";

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
