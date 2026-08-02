"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  Activity,
  BedDouble,
  ClipboardCheck,
  Receipt,
  ShieldAlert,
  Users,
  Boxes,
  Settings2,
  UserCog,
  HeartPulse,
  CalendarClock,
  KeySquare,
  Plug,
  Search,
  Bell,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileMenu } from "@/components/auth/user-profile-menu";
import { useAuthStore } from "@/store/use-auth-store";

export const sections = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "approvals", label: "Clinician Approvals", icon: ClipboardCheck },
  { id: "users", label: "Users & Sessions", icon: UserCog },
  { id: "patients", label: "Patient Registry", icon: HeartPulse },
  { id: "schedule", label: "Theatre Schedule", icon: CalendarClock },
  { id: "staff", label: "Staff & Access", icon: Users },
  { id: "roles", label: "Roles & Permissions", icon: KeySquare },
  { id: "wards", label: "Wards & Beds", icon: BedDouble },
  { id: "billing", label: "Revenue Ledger", icon: Receipt },
  { id: "supplies", label: "Supplies", icon: Boxes },
  { id: "audit", label: "Audit & Security", icon: ShieldAlert },
  { id: "integrations", label: "Integrations & Keys", icon: Plug },
  { id: "settings", label: "Facility Settings", icon: Settings2 },
] as const;

export type SectionId = (typeof sections)[number]["id"];

export function AdminShell({
  active,
  onSelect,
  children,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
  children: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const { user } = useAuthStore();
  const currentSection = sections.find((s) => s.id === active);

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Top Glassmorphic Header */}
      <header className="bg-background/90 border-b border-border/60 sticky top-0 z-40 backdrop-blur-md transition-all">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group" aria-label="HealOS home">
              <HealOSLogo size={30} />
            </Link>

            <div className="hidden md:flex items-center gap-2 border-l border-border/60 pl-4">
              <span className="mono-label text-[11px] text-muted-foreground uppercase font-mono tracking-wider">
                Admin Console
              </span>
              <span className="text-muted-foreground/50">/</span>
              <span className="mono-label text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-amber-500" />
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
              placeholder="Search patients, staff, invoices, approvals..."
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
              <span className="bg-amber-500 absolute top-1.5 right-1.5 size-2 animate-ping rounded-full" />
              <span className="bg-amber-500 absolute top-1.5 right-1.5 size-2 rounded-full" />
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
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-r border-border/60 bg-card/20 p-4 md:flex overflow-y-auto">
          <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
            <Sparkles className="size-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                Admin: {user?.name.split(" ")[0] || "Administrator"}
              </p>
              <p className="mono-label text-[10px] text-amber-600 dark:text-amber-400 font-mono uppercase">
                System Superadmin
              </p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {sections.map((s, i) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={`mono-label group relative flex items-center gap-3 px-3.5 py-2 rounded-lg text-left transition-all cursor-pointer text-xs ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className={`size-3.5 ${isActive ? "text-primary-foreground" : "text-primary/70 group-hover:text-primary"}`} />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-border/70 bg-card/60 p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="mono-label text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                System Status
              </span>
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="font-semibold text-xs mt-1 text-foreground">All Systems Nominal</p>
            <p className="mono-label text-[10px] text-muted-foreground mt-0.5 font-mono">
              MongoDB Atlas Cloud Connected
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1">
          {/* Mobile Header Tabs */}
          <div className="border-b border-border/60 flex gap-1.5 overflow-x-auto p-2 bg-card/40 md:hidden">
            {sections.map((s) => (
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

export function PanelHeader({
  index,
  title,
  note,
  actions,
}: {
  index: string;
  title: string;
  note: string;
  actions?: ReactNode;
}) {
  return (
    <div className="hairline-b flex flex-wrap items-end justify-between gap-4 px-5 py-6 sm:px-8">
      <div>
        <p className="mono-label text-accent/80">{index}</p>
        <h1 className="mt-2 font-mono text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-muted-foreground mt-1 max-w-xl text-sm">{note}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function ActionButton({
  children,
  tone = "ghost",
  type = "button",
  disabled = false,
  className,
  onClick,
}: {
  children: ReactNode;
  tone?: "ghost" | "solid";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={`mono-label inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors disabled:opacity-50 ${
        tone === "ghost"
          ? "hover:bg-foreground/4"
          : "bg-foreground text-background hover:bg-foreground/90"
      } ${className || ""}`}
    >
      {children}
    </button>
  );
}
