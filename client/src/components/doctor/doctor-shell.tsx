import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  Activity,
  Stethoscope,
  CalendarClock,
  FlaskConical,
  Pill,
  FileSignature,
  MessagesSquare,
  CalendarDays,
  Search,
  Bell,
} from "lucide-react";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const doctorSections = [
  { id: "shift", label: "Shift board", icon: Activity },
  { id: "rounds", label: "My patients", icon: Stethoscope },
  { id: "clinic", label: "Clinic list", icon: CalendarClock },
  { id: "results", label: "Results inbox", icon: FlaskConical },
  { id: "orders", label: "Orders & meds", icon: Pill },
  { id: "notes", label: "Documentation", icon: FileSignature },
  { id: "handover", label: "Handover", icon: MessagesSquare },
  { id: "rota", label: "My rota", icon: CalendarDays },
] as const;

export type DoctorSectionId = (typeof doctorSections)[number]["id"];

export function DoctorShell({
  active,
  onSelect,
  children,
}: {
  active: DoctorSectionId;
  onSelect: (id: DoctorSectionId) => void;
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
            Clinician workspace / Cardiology
          </span>

          <div className="hairline ml-auto hidden w-72 items-center gap-2 px-3 py-2 lg:flex">
            <Search className="text-muted-foreground size-3.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patients, MRN, results"
              className="mono-label placeholder:text-muted-foreground w-full bg-transparent outline-none"
            />
          </div>

          <button
            type="button"
            className="hairline relative ml-auto p-2 lg:ml-0"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            <span className="bg-destructive absolute top-1 right-1 size-1.5 animate-pulse rounded-full" />
          </button>
          <ThemeToggle />
          <div className="hairline-l hidden items-center gap-3 pl-4 sm:flex">
            <div className="text-right">
              <p className="mono-label leading-none">Dr. R. Deshmukh</p>
              <p className="mono-label text-muted-foreground leading-none">
                On shift · Ward + clinic
              </p>
            </div>
            <div className="bg-accent/15 text-brass mono-label grid size-9 place-items-center">
              RD
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col border-r border-[var(--hairline)] p-3 md:flex">
          <nav className="flex flex-col gap-0.5">
            {doctorSections.map((s, i) => {
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
                      layoutId="doctor-nav-marker"
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
            <p className="mono-label text-muted-foreground">Escalation</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="bg-destructive size-1.5 animate-pulse rounded-full" />
              <span className="mono-label">2 critical results</span>
            </div>
            <p className="mono-label text-muted-foreground mt-2">
              crash team ext. 2200 · bleep 118
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="hairline-b flex gap-1 overflow-x-auto px-3 py-2 md:hidden">
            {doctorSections.map((s) => (
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
