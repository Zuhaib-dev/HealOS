import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pharmacy Dashboard | HealOS",
  description: "Inventory, prescriptions, and dispensaries.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
