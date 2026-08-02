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
} from "lucide-react";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const sections = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "approvals", label: "Approvals", icon: ClipboardCheck },
  { id: "users", label: "Users & sessions", icon: UserCog },
  { id: "patients", label: "Patient registry", icon: HeartPulse },
  { id: "schedule", label: "Theatre schedule", icon: CalendarClock },
  { id: "staff", label: "Staff & access", icon: Users },
  { id: "roles", label: "Roles & permissions", icon: KeySquare },
  { id: "wards", label: "Wards & beds", icon: BedDouble },
  { id: "billing", label: "Revenue ledger", icon: Receipt },
  { id: "supplies", label: "Supplies", icon: Boxes },
  { id: "audit", label: "Audit & security", icon: ShieldAlert },
  { id: "integrations", label: "Integrations & keys", icon: Plug },
  { id: "settings", label: "Facility settings", icon: Settings2 },
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

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="bg-background/90 hairline-b sticky top-0 z-40 backdrop-blur-md">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="HealOS home">
            <HealOSLogo size={28} />
          </Link>
          <span className="mono-label text-muted-foreground hairline-l hidden pl-4 md:inline">
            Admin console / St. Meridian General
          </span>

          <div className="hairline ml-auto hidden w-72 items-center gap-2 px-3 py-2 lg:flex">
            <Search className="text-muted-foreground size-3.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patients, staff, invoices"
              className="mono-label placeholder:text-muted-foreground w-full bg-transparent outline-none"
            />
          </div>

          <button
            type="button"
            className="hairline relative ml-auto p-2 lg:ml-0"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            <span className="bg-accent absolute top-1 right-1 size-1.5 rounded-full" />
          </button>
          <ThemeToggle />
          <div className="hairline-l hidden items-center gap-3 pl-4 sm:flex">
            <div className="text-right">
              <p className="mono-label leading-none">A. Marchetti</p>
              <p className="mono-label text-muted-foreground leading-none">Superadmin</p>
            </div>
            <div className="bg-accent/15 text-brass mono-label grid size-9 place-items-center">
              AM
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky border-r border-[var(--hairline)] top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col p-3 md:flex">
          <nav className="flex flex-col gap-0.5">
            {sections.map((s, i) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={`mono-label group relative flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-accent/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="admin-nav-marker"
                      className="bg-accent absolute top-0 left-0 h-full w-[2px]"
                    />
                  )}
                  <span className="text-accent/60">{String(i + 1).padStart(2, "0")}</span>
                  <Icon className="size-3.5" />
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="hairline mt-auto p-3">
            <p className="mono-label text-muted-foreground">System status</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="bg-accent size-1.5 animate-pulse rounded-full" />
              <span className="mono-label">All services nominal</span>
            </div>
            <p className="mono-label text-muted-foreground mt-2">uptime 99.993% · rev 0918</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="hairline-b flex gap-1 overflow-x-auto px-3 py-2 md:hidden">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                className={`mono-label shrink-0 px-3 py-2 ${
                  active === s.id ? "bg-accent/10 text-foreground" : "text-muted-foreground"
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
  onClick,
}: {
  children: ReactNode;
  tone?: "ghost" | "solid";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`mono-label px-3.5 py-2 transition-opacity hover:opacity-80 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${
        tone === "solid" ? "bg-foreground text-background" : "hairline text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
