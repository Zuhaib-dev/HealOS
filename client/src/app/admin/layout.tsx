import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | HealOS",
  description: "Hospital administration, staff management, and analytics.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
