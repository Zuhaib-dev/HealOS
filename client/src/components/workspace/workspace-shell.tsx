import { useState, type ComponentType, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Menu } from "lucide-react";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileMenu } from "@/components/auth/user-profile-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

export type WorkspaceSection = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

export function WorkspaceShell({
  breadcrumb,
  searchPlaceholder,
  sections,
  user,
  statusTitle,
  statusLine,
  statusNote,
  navId,
  children,
}: {
  breadcrumb: string;
  searchPlaceholder: string;
  sections: readonly WorkspaceSection[];
  user?: { name: string; role: string; initials: string };
  statusTitle: string;
  statusLine: string;
  statusNote: string;
  navId: string;
  children: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const pathname = usePathname();

  const defaultSectionId = sections[0]?.id;
  const isSectionActive = (id: string) => {
    return id === defaultSectionId ? pathname === `/${navId}` : pathname.startsWith(`/${navId}/${id}`);
  };

  const mainMobileTabs = sections.slice(0, 4);
  const moreMobileTabs = sections.slice(4);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="bg-background/90 hairline-b sticky top-0 z-40 backdrop-blur-md">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="HealOS home">
            <HealOSLogo size={28} />
          </Link>
          <span className="mono-label text-muted-foreground hairline-l hidden pl-4 md:inline">
            {breadcrumb}
          </span>

          <div className="hairline ml-auto hidden w-72 items-center gap-2 px-3 py-2 lg:flex">
            <Search className="text-muted-foreground size-3.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
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
          <div className="hairline-l flex items-center gap-2 pl-3 sm:gap-3 sm:pl-4">
            <UserProfileMenu />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col border-r border-(--hairline) p-3 md:flex">
          <nav className="flex flex-col gap-0.5">
            {sections.map((s, i) => {
              const Icon = s.icon;
              const isActive = isSectionActive(s.id);
              const href = s.id === defaultSectionId ? `/${navId}` : `/${navId}/${s.id}`;
              return (
                <Link
                  key={s.id}
                  href={href}
                  className={`mono-label group relative flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-accent/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/3"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId={`${navId}-nav-marker`}
                      className="bg-accent absolute top-0 left-0 h-full w-0.5"
                    />
                  )}
                  <span className="text-accent/60">{String(i + 1).padStart(2, "0")}</span>
                  <Icon className="size-3.5" />
                  {s.label}
                </Link>
              );
            })}
          </nav>

          <div className="hairline mt-auto p-3">
            <p className="mono-label text-muted-foreground">{statusTitle}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="bg-accent size-1.5 animate-pulse rounded-full" />
              <span className="mono-label">{statusLine}</span>
            </div>
            <p className="mono-label text-muted-foreground mt-2">{statusNote}</p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 relative pb-24 md:pb-0">
          {children}
        </main>
      </div>

      {/* Persistent Bottom Navigation Bar - Mobile Only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/60 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
        <nav className="flex justify-around items-center px-2 py-1.5">
          {mainMobileTabs.map((s) => {
            const Icon = s.icon;
            const isActive = isSectionActive(s.id);
            const href = s.id === defaultSectionId ? `/${navId}` : `/${navId}/${s.id}`;
            return (
              <Link
                key={s.id}
                href={href}
                onClick={() => setIsMoreOpen(false)}
                className="relative flex-1 flex flex-col items-center justify-center py-1.5 transition-all outline-none group tap-highlight-transparent"
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

          {/* More / Menu Tab (Drawer) - Only show if there are more than 4 tabs */}
          {moreMobileTabs.length > 0 && (
            <Drawer open={isMoreOpen} onOpenChange={setIsMoreOpen}>
              <DrawerTrigger asChild>
                <button
                  type="button"
                  className="relative flex-1 flex flex-col items-center justify-center py-1.5 transition-all outline-none group tap-highlight-transparent"
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
              <DrawerContent className="bg-background/95 backdrop-blur-xl border-t border-border/60">
                <DrawerHeader className="border-b border-border/40 pb-4 text-left flex justify-between items-center px-6">
                  <DrawerTitle className="text-lg font-semibold flex items-center gap-2">
                    <Menu className="size-5 text-primary" />
                    Menu
                  </DrawerTitle>
                  <UserProfileMenu />
                </DrawerHeader>
                <div className="p-4 grid grid-cols-4 gap-4">
                  {moreMobileTabs.map((s) => {
                    const Icon = s.icon;
                    const isActive = isSectionActive(s.id);
                    const href = s.id === defaultSectionId ? `/${navId}` : `/${navId}/${s.id}`;
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
