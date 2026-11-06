"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

const prefetchRoutes = [
  "/nurse",
  "/nurse/emar",
  "/nurse/wounds",
  "/nurse/fluids",
  "/nurse/bells",
  "/nurse/handover",
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    prefetchRoutes.forEach((href) => {
      router.prefetch(href);
    });
  }, [router]);

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
