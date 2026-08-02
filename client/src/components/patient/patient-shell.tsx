"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  LayoutDashboard,
  CalendarPlus,
  History,
  FileText,
  Pill,
  Receipt,
  MessagesSquare,
  UserRound,
  Search,
  Bell,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileMenu } from "@/components/auth/user-profile-menu";
import { useAuthStore } from "@/store/use-auth-store";

export const patientSections = [
  { id: "overview", label: "My Health", icon: LayoutDashboard },
  { id: "book", label: "Book Appointment", icon: CalendarPlus },
  { id: "appointments", label: "Visits & Schedule", icon: History },
  { id: "reports", label: "Lab & Diagnostic Records", icon: FileText },
  { id: "meds", label: "Prescriptions & Meds", icon: Pill },
  { id: "billing", label: "Bills & Claims", icon: Receipt },
  { id: "messages", label: "Care Team Chat", icon: MessagesSquare },
  { id: "profile", label: "Personal Profile", icon: UserRound },
] as const;

export type PatientSectionId = (typeof patientSections)[number]["id"];

export function PatientShell({
  active,
  onSelect,
  children,
}: {
  active: PatientSectionId;
  onSelect: (id: PatientSectionId) => void;
  children: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const { user } = useAuthStore();
  const currentSection = patientSections.find((s) => s.id === active);

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Top Instrument Header */}
      <header className="bg-background/90 border-b border-border/60 sticky top-0 z-40 backdrop-blur-md transition-all">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group" aria-label="HealOS home">
              <HealOSLogo size={30} />
            </Link>

            <div className="hidden md:flex items-center gap-2 border-l border-border/60 pl-4">
              <span className="mono-label text-[11px] text-muted-foreground uppercase font-mono tracking-wider">
                Patient Portal
              </span>
              <span className="text-muted-foreground/50">/</span>
              <span className="mono-label text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                {currentSection?.label}
              </span>
            </div>
          </div>

          {/* Search bar instrument */}
          <div className="hidden lg:flex w-80 items-center gap-2.5 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search className="text-muted-foreground size-3.5 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search health records, doctors, prescriptions..."
              className="mono-label placeholder:text-muted-foreground/70 w-full bg-transparent text-xs outline-none"
            />
            <kbd className="mono-label hidden xl:inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border">
              ⌘K
            </kbd>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              className="group relative flex items-center justify-center size-9 rounded-full border border-border/70 bg-card/60 hover:bg-muted/50 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="bg-emerald-500 absolute top-1.5 right-1.5 size-2 animate-ping rounded-full" />
              <span className="bg-emerald-500 absolute top-1.5 right-1.5 size-2 rounded-full" />
            </button>

            <ThemeToggle />

            <div className="border-l border-border/60 pl-3">
              <UserProfileMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-r border-border/60 bg-card/20 p-4 md:flex">
          <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5">
            <Sparkles className="size-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                Welcome, {user?.name.split(" ")[0] || "Patient"}
              </p>
              <p className="mono-label text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                Verified Health Account
              </p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {patientSections.map((s, i) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={`mono-label group relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left transition-all cursor-pointer text-xs ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? "text-primary-foreground" : "text-primary/70 group-hover:text-primary"}`} />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="mono-label text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                Next Appointment
              </span>
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="font-semibold text-xs mt-2 text-foreground">Doctor Consultation</p>
            <p className="mono-label text-[11px] text-muted-foreground mt-1 font-mono">
              Available 24/7 in Book Tab
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1">
          {/* Mobile Header Tabs */}
          <div className="border-b border-border/60 flex gap-1.5 overflow-x-auto p-2 bg-card/40 md:hidden">
            {patientSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                className={`mono-label text-xs shrink-0 px-3 py-1.5 rounded-md transition-colors ${
                  active === s.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground bg-muted/30"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
