import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Emergency Room (ER) | HealOS",
  description: "Critical care, triage, and rapid response.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
