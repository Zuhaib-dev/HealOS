import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Radiology Dashboard | HealOS",
  description: "Imaging requests, scans, and reports.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
