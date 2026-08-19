import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Doctor Dashboard | HealOS",
  description: "Patient consultations, medical records, and prescriptions.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
