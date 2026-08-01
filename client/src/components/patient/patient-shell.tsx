import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { patient } from "./patient-data";

export const patientSections = [
  { id: "overview", label: "My health", icon: LayoutDashboard },
  { id: "book", label: "Book appointment", icon: CalendarPlus },
  { id: "appointments", label: "Appointments", icon: History },
  { id: "reports", label: "Reports & records", icon: FileText },
  { id: "meds", label: "Medications", icon: Pill },
  { id: "billing", label: "Bills & insurance", icon: Receipt },
  { id: "messages", label: "Messages", icon: MessagesSquare },
  { id: "profile", label: "Profile", icon: UserRound },
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
  const initials = patient.name
    .split(" ")
    .map((p) => p[0])
    .join("");

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="bg-background/90 hairline-b sticky top-0 z-40 backdrop-blur-md">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3" aria-label="HealOS home">
            <HealOSLogo size={28} />
          </Link>
          <span className="mono-label text-muted-foreground hairline-l hidden pl-4 md:inline">
            Patient portal / {patient.mrn}
          </span>

          <div className="hairline ml-auto hidden w-72 items-center gap-2 px-3 py-2 lg:flex">
            <Search className="text-muted-foreground size-3.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports, visits, medicines"
              className="mono-label placeholder:text-muted-foreground w-full bg-transparent outline-none"
            />
          </div>

          <button
            type="button"
            className="hairline relative ml-auto p-2 lg:ml-0"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            <span className="bg-accent absolute top-1 right-1 size-1.5 animate-pulse rounded-full" />
          </button>
          <ThemeToggle />
          <div className="hairline-l hidden items-center gap-3 pl-4 sm:flex">
            <div className="text-right">
              <p className="mono-label leading-none">{patient.name}</p>
              <p className="mono-label text-muted-foreground leading-none">
                {patient.age}
                {patient.sex} · {patient.blood}
              </p>
            </div>
            <div className="bg-accent/15 text-brass mono-label grid size-9 place-items-center">
              {initials}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col border-r border-[var(--hairline)] p-3 md:flex">
          <nav className="flex flex-col gap-0.5">
            {patientSections.map((s, i) => {
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
                      layoutId="patient-nav-marker"
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
            <p className="mono-label text-muted-foreground">Next visit</p>
            <p className="mono-label mt-2">04 Aug · 09:15 · US-2</p>
            <p className="mono-label text-muted-foreground mt-2">
              fast six hours before the scan
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="hairline-b flex gap-1 overflow-x-auto px-3 py-2 md:hidden">
            {patientSections.map((s) => (
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
