"use client";

/* Hallmark · pre-emit critique: P4 H4 E4 S4 R4 V3
 * genre: modern-minimal · macrostructure: Workbench
 * theme: Emerald Prestige · designed-as-app
 * audience: clinicians · use: see today's list and open a visit
 */

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle,
} from "lucide-react";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileMenu } from "@/components/auth/user-profile-menu";
import { NotificationBell } from "@/components/shared/notification-bell";
import { useAuthStore } from "@/store/use-auth-store";
import { useUIStore } from "@/store/use-ui-store";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerTitle,
  DrawerHeader,
  DrawerClose,
} from "@/components/ui/drawer";

export const doctorSections = [
  { id: "shift", label: "Shift", shortLabel: "Shift", icon: Activity },
  {
    id: "rounds",
    label: "Patients",
    shortLabel: "Patients",
    icon: Stethoscope,
  },
  { id: "clinic", label: "Clinic", shortLabel: "Clinic", icon: CalendarClock },
  {
    id: "results",
    label: "Results",
    shortLabel: "Results",
    icon: FlaskConical,
  },
  { id: "orders", label: "Orders", shortLabel: "Orders", icon: Pill },
  { id: "notes", label: "Notes", shortLabel: "Notes", icon: FileSignature },
  {
    id: "handover",
    label: "Handover",
    shortLabel: "Handover",
    icon: MessagesSquare,
  },
  { id: "rota", label: "Rota", shortLabel: "Rota", icon: CalendarDays },
  { id: "profile", label: "Profile", shortLabel: "Profile", icon: UserCircle },
] as const;

const mainMobileTabs = ["shift", "clinic", "rounds", "results"];
const moreMobileTabs = ["orders", "notes", "handover", "rota", "profile"];

export type DoctorSectionId = (typeof doctorSections)[number]["id"];

export function DoctorShell({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const pathname = usePathname();
  const isSectionActive = (id: string) =>
    id === "shift"
      ? pathname === "/doctor"
      : pathname.startsWith(`/doctor/${id}`);

  const currentSection =
    doctorSections.find((s) => isSectionActive(s.id)) || doctorSections[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="hairline-b sticky top-0 z-40 bg-background/90 backdrop-blur-md">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="HealOS home"
            title="HealOS home"
          >
            <HealOSLogo size={28} />
          </Link>
          <span className="mono-label hairline-l hidden pl-4 text-muted-foreground md:inline">
            Clinician / {currentSection.label}
          </span>

          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-command-menu"))
            }
            aria-label="Search patients, MRN, lab results"
            className="hairline ml-auto hidden w-72 items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/40 lg:flex"
          >
            <Search className="size-3.5 text-muted-foreground" />
            <span className="mono-label w-full truncate text-xs text-muted-foreground">
              Search patients, MRN, results
            </span>
          </button>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <NotificationBell />
            <ThemeToggle />
            <div className="hairline-l pl-3">
              <UserProfileMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col overflow-y-auto border-r border-(--hairline) p-3 transition-all duration-300 ease-in-out md:flex ${
            isSidebarCollapsed ? "w-18 items-center px-2" : "w-60"
          }`}
        >
          <nav
            aria-label="Clinician sidebar"
            className="flex w-full flex-col gap-0.5"
          >
            {doctorSections.map((s, i) => {
              const Icon = s.icon;
              const isActive = isSectionActive(s.id);
              const href = s.id === "shift" ? "/doctor" : `/doctor/${s.id}`;
              return (
                <Link
                  key={s.id}
                  href={href}
                  prefetch={false}
                  title={isSidebarCollapsed ? s.label : undefined}
                  className={`mono-label group relative flex items-center text-left transition-colors ${
                    isSidebarCollapsed
                      ? "justify-center px-0 py-3"
                      : "gap-3 px-3 py-2.5"
                  } ${
                    isActive
                      ? "bg-accent/10 text-foreground"
                      : "text-muted-foreground hover:bg-foreground/3 hover:text-foreground"
                  }`}
                >
                  {isActive && !isSidebarCollapsed ? (
                    <motion.span
                      layoutId="doctor-nav-marker"
                      className="absolute top-0 left-0 h-full w-0.5 bg-accent"
                    />
                  ) : null}
                  {!isSidebarCollapsed ? (
                    <span className="text-accent/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  ) : null}
                  <Icon className="size-3.5" />
                  {!isSidebarCollapsed ? s.label : null}
                </Link>
              );
            })}
          </nav>

          <div
            className={`hairline mt-auto overflow-hidden ${
              isSidebarCollapsed ? "flex flex-col items-center p-2 py-3" : "p-3"
            }`}
          >
            {isSidebarCollapsed ? (
              <span
                className="size-1.5 animate-pulse rounded-full bg-accent"
                title="Signed in"
              />
            ) : (
              <>
                <p className="mono-label text-muted-foreground">Clinician</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                  <span className="mono-label truncate">
                    {user?.name ? `Dr. ${user.name}` : "Signed in"}
                  </span>
                </div>
                <p className="mono-label mt-2 text-muted-foreground">
                  Shift, clinic, and notes stay on this account
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            className={`hairline mt-3 flex items-center justify-center p-2 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground ${
              isSidebarCollapsed ? "" : "w-full"
            }`}
            aria-label="Toggle sidebar"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="size-4.5" />
            ) : (
              <PanelLeftClose className="size-4.5" />
            )}
          </button>
        </aside>

        <main className="relative min-w-0 flex-1 pb-24 md:pb-0">
          {children}
        </main>
      </div>

      <div className="fixed right-0 bottom-0 left-0 z-50 border-t border-border/60 bg-background/95 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl md:hidden dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
        <nav
          aria-label="Clinician mobile navigation"
          className="mx-auto flex max-w-md items-center justify-around px-1.5 py-1"
        >
          {doctorSections
            .filter((s) => mainMobileTabs.includes(s.id))
            .map((s) => {
              const Icon = s.icon;
              const isActive = isSectionActive(s.id);
              const href = s.id === "shift" ? "/doctor" : `/doctor/${s.id}`;
              return (
                <Link
                  key={s.id}
                  href={href}
                  prefetch={false}
                  onClick={() => setIsMoreOpen(false)}
                  className="tap-highlight-transparent group relative flex min-w-0 flex-1 flex-col items-center justify-center px-0.5 py-1 outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                >
                  <span
                    className={`flex items-center justify-center p-1 ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon
                      className="size-4.5"
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </span>
                  <span
                    className={`mt-0.5 block max-w-full truncate text-center text-[10px] leading-tight tracking-tight ${
                      isActive
                        ? "font-semibold text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {s.shortLabel}
                  </span>
                </Link>
              );
            })}

          <Drawer open={isMoreOpen} onOpenChange={setIsMoreOpen}>
            <DrawerTrigger asChild>
              <button
                type="button"
                className="tap-highlight-transparent relative flex min-w-0 flex-1 flex-col items-center justify-center px-0.5 py-1 outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
              >
                <span
                  className={`flex items-center justify-center p-1 ${
                    moreMobileTabs.some((id) => isSectionActive(id))
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Menu className="size-4.5" />
                </span>
                <span
                  className={`mt-0.5 block text-[10px] ${
                    moreMobileTabs.some((id) => isSectionActive(id))
                      ? "font-semibold text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  More
                </span>
              </button>
            </DrawerTrigger>
            <DrawerContent className="border-t border-border/60 bg-background/95 backdrop-blur-xl">
              <DrawerHeader className="flex items-center justify-between border-b border-border/40 px-6 pb-4 text-left">
                <DrawerTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Menu className="size-5 text-primary" />
                  Menu
                </DrawerTitle>
                <UserProfileMenu />
              </DrawerHeader>
              <div className="grid grid-cols-4 gap-4 p-4">
                {doctorSections
                  .filter((s) => moreMobileTabs.includes(s.id))
                  .map((s) => {
                    const Icon = s.icon;
                    const isActive = isSectionActive(s.id);
                    const href =
                      s.id === "shift" ? "/doctor" : `/doctor/${s.id}`;
                    return (
                      <Link
                        key={s.id}
                        href={href}
                        onClick={() => setIsMoreOpen(false)}
                        className={`flex flex-col items-center gap-2 border p-3 transition-colors ${
                          isActive
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-border/40 bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <Icon
                          className="size-6"
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span className="max-w-full truncate text-center text-[11px] font-semibold">
                          {s.shortLabel}
                        </span>
                      </Link>
                    );
                  })}
              </div>
              <div className="mt-auto border-t border-border/40 p-4">
                <DrawerClose asChild>
                  <button
                    type="button"
                    className="w-full border border-border/50 bg-muted/50 py-3.5 text-sm font-semibold"
                  >
                    Close menu
                  </button>
                </DrawerClose>
              </div>
            </DrawerContent>
          </Drawer>
        </nav>
      </div>

      <style jsx global>{`
        .pb-safe {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom, 8px));
        }
        .tap-highlight-transparent {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
}
