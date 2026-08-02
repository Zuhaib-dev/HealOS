"use client";

import { useState } from "react";
import { UserPlus, Ticket, Banknote } from "lucide-react";
import { WorkspaceShell, type WorkspaceSection } from "@/components/workspace/workspace-shell";
import { RegistrationPanel } from "@/components/reception/registration-panel";
import { QueuePanel } from "@/components/reception/queue-panel";
import { CounterPanel } from "@/components/reception/counter-panel";
import { useAuthStore } from "@/store/use-auth-store";

const sections = [
  { id: "registration", label: "Registration", icon: UserPlus },
  { id: "queue", label: "Token & queue", icon: Ticket },
  { id: "counter", label: "Cash counter", icon: Banknote },
] as const satisfies readonly WorkspaceSection[];

export default function ReceptionPage() {
  const [active, setActive] = useState<string>("registration");
  const { user } = useAuthStore();

  const getInitials = (name?: string) => {
    if (!name) return "FD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <WorkspaceShell
      navId="reception"
      breadcrumb="Access & flow / Front desk (OPD)"
      searchPlaceholder="Search MRN, mobile, ABHA"
      sections={sections}
      active={active}
      onSelect={setActive}
      user={{ name: user?.name || "Front Desk", role: user?.role || "Front desk", initials: getInitials(user?.name) }}
      statusTitle="Counter"
      statusLine="Counter 2 open"
      statusNote="23 tokens waiting · float balanced"
    >
      {active === "registration" && <RegistrationPanel />}
      {active === "queue" && <QueuePanel />}
      {active === "counter" && <CounterPanel />}
    </WorkspaceShell>
  );
}
