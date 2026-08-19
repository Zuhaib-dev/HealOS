import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reception Desk | HealOS",
  description: "Patient registration, billing, and appointments.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
