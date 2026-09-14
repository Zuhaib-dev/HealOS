import { SystemHealthPanel } from "@/components/admin/panels/system-health-panel";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Health | HealOS Admin",
  description: "Live monitoring of servers and infrastructure.",
};

export default function SystemHealthPage() {
  return <SystemHealthPanel />;
}
