"use client";

import {
  ClipboardList,
  Pill,
  Bandage,
  Droplet,
  Bell,
  MessagesSquare,
} from "lucide-react";

import { RoleGuard } from "@/components/auth/role-guard";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

const sections = [
  { id: "rounds", label: "Rounds", shortLabel: "Rounds", icon: ClipboardList },
  { id: "emar", label: "Meds", shortLabel: "Meds", icon: Pill },
  { id: "wounds", label: "Wounds", shortLabel: "Wounds", icon: Bandage },
  { id: "fluids", label: "Fluids", shortLabel: "Fluids", icon: Droplet },
  { id: "bells", label: "Bells", shortLabel: "Bells", icon: Bell },
  {
    id: "handover",
    label: "Handover",
    shortLabel: "Handover",
    icon: MessagesSquare,
  },
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={["NURSE"]}>
      <WorkspaceShell
        navId="nurse"
        breadcrumb="Ward operations / Nursing station"
        searchPlaceholder="Search bed, MRN, patient"
        sections={sections}
        statusTitle="Shift"
        statusLine="Live ward station"
        statusNote="Vitals, meds, bells, and handover update from the ward"
      >
        {children}
      </WorkspaceShell>
    </RoleGuard>
  );
}
