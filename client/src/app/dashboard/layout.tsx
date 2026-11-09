import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";
// ============================================
// This layout wraps ALL dashboard pages across all roles.
// It will include the sidebar navigation and top bar.
// Role-based content is handled by nested route groups:
//   /dashboard/patient/*
//   /dashboard/doctor/*
//   /dashboard/nurse/*
//   /dashboard/lab/*
//   /dashboard/pharmacy/*
//   /dashboard/billing/*
//   /dashboard/admin/*

export const metadata: Metadata = createPageMetadata(
  "HealOS Dashboard",
  "HealOS Dashboard workspace in HealOS.",
  { noIndex: true },
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* <Sidebar /> */}
      <main className="flex-1">
        {/* <TopBar /> */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
