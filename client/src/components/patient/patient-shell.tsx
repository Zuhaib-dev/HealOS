"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileMenu } from "@/components/auth/user-profile-menu";
import { useAuthStore } from "@/store/use-auth-store";
import { useUIStore } from "@/store/use-ui-store";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

export const patientSections = [
  { id: "overview", label: "Home", icon: LayoutDashboard },
  { id: "book", label: "Book", icon: CalendarPlus },
  { id: "appointments", label: "Visits", icon: History },
  { id: "reports", label: "Records", icon: FileText },
  { id: "meds", label: "Meds", icon: Pill },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "messages", label: "Chat", icon: MessagesSquare },
  { id: "profile", label: "Profile", icon: UserRound },
] as const;

export type PatientSectionId = (typeof patientSections)[number]["id"];

// Mobile Bottom Nav Layout
const mainMobileTabs = ["overview", "book", "appointments", "messages"];
const moreMobileTabs = ["reports", "meds", "billing", "profile"];

export function PatientShell({
  children,
}: {
  children: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const { user } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const pathname = usePathname();

  const currentSection = patientSections.find((s) =>
    s.id === "overview" ? pathname === "/patient" : pathname.startsWith(`/patient/${s.id}`)
  ) || patientSections[0];

  // Helper to check if a section is active
  const isSectionActive = (id: string) => {
    return id === "overview" ? pathname === "/patient" : pathname.startsWith(`/patient/${id}`);
  };

  return (
    <div className="bg-background text-foreground min-h-screen pb-24 md:pb-0">
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
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-menu"))}
            aria-label="Search health records, doctors, prescriptions"
            className="hidden lg:flex w-80 items-center gap-2.5 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:border-primary/50 transition-all text-left cursor-pointer"
          >
            <Search className="text-muted-foreground size-3.5 shrink-0" />
            <span className="mono-label text-muted-foreground/70 flex-1 text-xs truncate">
              Search health records, doctors, prescriptions...
            </span>
            <kbd className="mono-label hidden xl:inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border">
              ⌘K
            </kbd>
          </button>

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

            <div className="border-l border-border/60 pl-3 block">
              <UserProfileMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex">
        {/* Sidebar Navigation - Desktop Only */}
        <aside 
          className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-border/60 bg-card/20 p-4 md:flex overflow-y-auto transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-18 items-center px-2" : "w-64"}`}
        >
          {isSidebarCollapsed ? (
            <div className="mb-4 mt-2 flex justify-center">
              <div className="size-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs uppercase">
                {user?.name?.charAt(0) || "P"}
              </div>
            </div>
          ) : (
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
          )}

          <nav aria-label="Patient portal sidebar navigation" className="flex flex-col gap-1 w-full">
            {patientSections.map((s) => {
              const Icon = s.icon;
              const isActive = isSectionActive(s.id);
              const href = s.id === "overview" ? "/patient" : `/patient/${s.id}`;
              return (
                <Link
                  key={s.id}
                  href={href}
                  title={isSidebarCollapsed ? s.label : undefined}
                  className={`mono-label group relative flex items-center ${isSidebarCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"} rounded-lg text-left transition-all cursor-pointer text-xs ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? "text-primary-foreground" : "text-primary/70 group-hover:text-primary"}`} />
                  {!isSidebarCollapsed && <span>{s.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className={`mt-auto rounded-xl border border-border/70 bg-card/60 shadow-sm transition-all overflow-hidden ${isSidebarCollapsed ? "p-2 py-3 flex flex-col items-center" : "p-4"}`}>
            {isSidebarCollapsed ? (
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Next Appointment Available" />
            ) : (
              <>
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
              </>
            )}
          </div>
          
          <button
            onClick={toggleSidebar}
            className={`mt-3 flex items-center justify-center p-2 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors border border-border/40 ${isSidebarCollapsed ? "" : "w-full"}`}
            aria-label="Toggle sidebar"
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="size-4.5" /> : <PanelLeftClose className="size-4.5" />}
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 relative">
          {/* Mobile "Header" - just the title of the current section */}
          <div className="md:hidden border-b border-border/60 bg-card/40 p-3 px-4 sticky top-0 z-30 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentSection && <currentSection.icon className="size-4 text-primary" />}
              <h1 className="font-semibold text-sm">{currentSection?.label}</h1>
            </div>
            <UserProfileMenu />
          </div>
          
          <div className="mx-auto w-full max-w-5xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Persistent Bottom Navigation Bar - Mobile Only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/60 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
        <nav aria-label="Patient portal mobile navigation" className="flex justify-around items-center px-2 py-1.5">
          {patientSections
            .filter((s) => mainMobileTabs.includes(s.id))
            .map((s) => {
              const Icon = s.icon;
              const isActive = isSectionActive(s.id);
              const href = s.id === "overview" ? "/patient" : `/patient/${s.id}`;
              return (
                <Link
                  key={s.id}
                  href={href}
                  onClick={() => setIsMoreOpen(false)}
                  className="relative flex-1 flex flex-col items-center justify-center py-1.5 transition-all outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-md group tap-highlight-transparent"
                >
                  <motion.div 
                    animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`relative flex items-center justify-center p-1.5 rounded-full transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <Icon className={`size-5 ${isActive ? "fill-primary/20" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
                  </motion.div>
                  <span 
                    className={`text-[10px] mt-0.5 font-medium transition-colors ${
                      isActive ? "text-primary font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </Link>
              );
            })}

          {/* More / Menu Tab (Drawer) */}
          <Drawer open={isMoreOpen} onOpenChange={setIsMoreOpen}>
            <DrawerTrigger asChild>
              <button
                type="button"
                className="relative flex flex-col items-center justify-center w-16 py-1.5 transition-all outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-md group tap-highlight-transparent"
              >
                <div className={`relative flex items-center justify-center p-1.5 rounded-full transition-colors ${
                  moreMobileTabs.some(id => isSectionActive(id)) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}>
                  <Menu className={`size-5 ${moreMobileTabs.some(id => isSectionActive(id)) ? "fill-primary/20" : ""}`} strokeWidth={moreMobileTabs.some(id => isSectionActive(id)) ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] mt-0.5 font-medium transition-colors ${
                  moreMobileTabs.some(id => isSectionActive(id)) ? "text-primary font-semibold" : "text-muted-foreground"
                }`}>
                  More
                </span>
              </button>
            </DrawerTrigger>
            <DrawerContent className="bg-background/95 backdrop-blur-xl border-t border-border/60">
              <DrawerHeader className="border-b border-border/40 pb-4 text-left flex justify-between items-center px-6">
                <DrawerTitle className="text-lg font-semibold flex items-center gap-2">
                  <Menu className="size-5 text-primary" />
                  Menu
                </DrawerTitle>
                <UserProfileMenu />
              </DrawerHeader>
              <div className="p-4 grid grid-cols-4 gap-4">
                {patientSections
                  .filter((s) => moreMobileTabs.includes(s.id))
                  .map((s) => {
                    const Icon = s.icon;
                    const isActive = isSectionActive(s.id);
                    const href = s.id === "overview" ? "/patient" : `/patient/${s.id}`;
                    return (
                      <Link
                        key={s.id}
                        href={href}
                        onClick={() => setIsMoreOpen(false)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                          isActive
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-muted/40 text-muted-foreground border border-border/40 active:bg-muted/60"
                        }`}
                      >
                        <Icon className="size-6" strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[11px] font-semibold tracking-wide">{s.label}</span>
                      </Link>
                    );
                  })}
              </div>
              <div className="p-4 pt-2 mt-auto">
                <DrawerClose asChild>
                  <button className="w-full bg-muted/50 text-foreground py-3.5 rounded-xl text-sm font-semibold border border-border/50 active:bg-muted/80 transition-colors">
                    Close Menu
                  </button>
                </DrawerClose>
              </div>
            </DrawerContent>
          </Drawer>
        </nav>
      </div>

      <style jsx global>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 16px);
        }
        .tap-highlight-transparent {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
}
