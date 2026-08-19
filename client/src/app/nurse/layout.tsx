import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nurse Dashboard | HealOS",
  description: "Patient vitals, triage, and ward management.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
