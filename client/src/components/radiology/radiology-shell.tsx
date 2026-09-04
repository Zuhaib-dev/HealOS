"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ScanLine,
  ListChecks,
  UploadCloud,
  FileText,
  FolderOpen,
  Siren,
  CalendarClock,
  Radiation,
  Search,
  Bell,
  ShieldCheck,
  Sparkles,
  Menu,
} from "lucide-react";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileMenu } from "@/components/auth/user-profile-menu";
import { useAuthStore } from "@/store/use-auth-store";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

export const radiologySections = [
  { id: "worklist", label: "Study Worklist", icon: ListChecks },
  { id: "upload", label: "Upload Diagnostic Reports", icon: UploadCloud },
  { id: "reporting", label: "Reporting Desk", icon: FileText },
  { id: "archive", label: "Study Archive", icon: FolderOpen },
  { id: "critical", label: "Critical Findings", icon: Siren },
  { id: "modalities", label: "Modalities & Dose", icon: Radiation },
  { id: "booking", label: "Slot Booking", icon: CalendarClock },
] as const;

export type RadiologySectionId = (typeof radiologySections)[number]["id"];

export function RadiologyShell({
  children,
}: {
  children: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { user } = useAuthStore();
  const pathname = usePathname();

  const mainMobileTabs = radiologySections.slice(0, 4);
  const moreMobileTabs = radiologySections.slice(4);

  const currentSection = radiologySections.find((s) =>
    s.id === "worklist" ? pathname === "/radiology" : pathname.startsWith(`/radiology/${s.id}`)
  ) || radiologySections[0];

  // Helper to check if a section is active
  const isSectionActive = (id: string) => {
    return id === "worklist" ? pathname === "/radiology" : pathname.startsWith(`/radiology/${id}`);
  };

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
                Radiology Workspace
              </span>
              <span className="text-muted-foreground/50">/</span>
              <span className="mono-label text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-cyan-500" />
                {currentSection?.label}
              </span>
            </div>
          </div>

          {/* Search bar instrument */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-command-menu"))}
            aria-label="Search accession number, MRN, X-Ray or CT scans"
            className="hidden lg:flex w-80 items-center gap-2.5 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:border-primary/50 transition-all text-left cursor-pointer"
          >
            <Search className="text-muted-foreground size-3.5 shrink-0" />
            <span className="mono-label text-muted-foreground/70 flex-1 text-xs truncate">
              Search accession #, MRN, X-Ray / CT scans...
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
              <span className="bg-cyan-500 absolute top-1.5 right-1.5 size-2 animate-ping rounded-full" />
              <span className="bg-cyan-500 absolute top-1.5 right-1.5 size-2 rounded-full" />
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
          <div className="mb-3 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-2.5">
            <Sparkles className="size-4 text-cyan-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                Dr. {user?.name || "Radiologist"}
              </p>
              <p className="mono-label text-[10px] text-cyan-600 dark:text-cyan-400 font-mono uppercase">
                {user?.role || "RADIOLOGIST"} · PACS Active
              </p>
            </div>
          </div>

          <nav aria-label="Radiology portal sidebar navigation" className="flex flex-col gap-1">
            {radiologySections.map((s) => {
              const Icon = s.icon;
              const isActive = isSectionActive(s.id);
              const href = s.id === "worklist" ? "/radiology" : `/radiology/${s.id}`;
              return (
                <Link
                  key={s.id}
                  href={href}
                  className={`mono-label group relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left transition-all cursor-pointer text-xs ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? "text-primary-foreground" : "text-primary/70 group-hover:text-primary"}`} />
                  <span>{s.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="mono-label text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                PACS Server
              </span>
              <span className="size-2 rounded-full bg-cyan-500 animate-pulse" />
            </div>
            <p className="font-semibold text-xs mt-1.5 text-foreground">DICOM Store Online</p>
            <p className="mono-label text-[10px] text-muted-foreground mt-0.5 font-mono">
              MongoDB Atlas Live Sync
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 pb-24 md:pb-0">
          {children}
        </main>
      </div>

      {/* Persistent Bottom Navigation Bar - Mobile Only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/60 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
        <nav aria-label="Radiology portal mobile navigation" className="flex justify-around items-center px-2 py-1.5">
          {mainMobileTabs.map((s) => {
            const Icon = s.icon;
            const isActive = isSectionActive(s.id);
            const href = s.id === "worklist" ? "/radiology" : `/radiology/${s.id}`;
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
          {moreMobileTabs.length > 0 && (
            <Drawer open={isMoreOpen} onOpenChange={setIsMoreOpen}>
              <DrawerTrigger asChild>
                <button
                  type="button"
                  className="relative flex-1 flex flex-col items-center justify-center py-1.5 transition-all outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-md group tap-highlight-transparent"
                >
                  <div className={`relative flex items-center justify-center p-1.5 rounded-full transition-colors ${
                    moreMobileTabs.some(s => isSectionActive(s.id)) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}>
                    <Menu className={`size-5 ${moreMobileTabs.some(s => isSectionActive(s.id)) ? "fill-primary/20" : ""}`} strokeWidth={moreMobileTabs.some(s => isSectionActive(s.id)) ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] mt-0.5 font-medium transition-colors ${
                    moreMobileTabs.some(s => isSectionActive(s.id)) ? "text-primary font-semibold" : "text-muted-foreground"
                  }`}>
                    More
                  </span>
                </button>
              </DrawerTrigger>
              <DrawerContent className="bg-background/95 backdrop-blur-xl border-t border-border/60 h-[85vh]">
                <DrawerHeader className="border-b border-border/40 pb-4 text-left flex justify-between items-center px-6">
                  <DrawerTitle className="text-lg font-semibold flex items-center gap-2">
                    <Menu className="size-5 text-primary" />
                    Menu
                  </DrawerTitle>
                  <UserProfileMenu />
                </DrawerHeader>
                <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-4 overflow-y-auto">
                  {moreMobileTabs.map((s) => {
                    const Icon = s.icon;
                    const isActive = isSectionActive(s.id);
                    const href = s.id === "worklist" ? "/radiology" : `/radiology/${s.id}`;
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
                        <span className="text-[10px] font-semibold tracking-wide text-center leading-tight">{s.label}</span>
                      </Link>
                    );
                  })}
                </div>
                <div className="p-4 pt-2 mt-auto border-t border-border/40">
                  <DrawerClose asChild>
                    <button className="w-full bg-muted/50 text-foreground py-3.5 rounded-xl text-sm font-semibold border border-border/50 active:bg-muted/80 transition-colors">
                      Close Menu
                    </button>
                  </DrawerClose>
                </div>
              </DrawerContent>
            </Drawer>
          )}
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
