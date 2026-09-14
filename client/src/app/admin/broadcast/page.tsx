import { BroadcastPanel } from "@/components/admin/panels/broadcast-panel";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Broadcast | HealOS Admin",
  description: "Send push notifications across the system.",
};

export default function BroadcastPage() {
  return <BroadcastPanel />;
}
