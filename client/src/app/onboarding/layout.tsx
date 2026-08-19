import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to HealOS | HealOS",
  description: "Complete your profile setup and onboarding.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
