import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Laboratory Dashboard | HealOS",
  description: "Test samples, analysis, and results.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
