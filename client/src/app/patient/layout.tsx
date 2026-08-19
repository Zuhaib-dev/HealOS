import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Portal | HealOS",
  description: "View appointments, test results, and medical history.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
