"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/store/use-auth-store";
import { UserProfileMenu } from "@/components/auth/user-profile-menu";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center p-4 sm:p-6 pointer-events-none">
        <header
          className={`pointer-events-auto flex w-full max-w-5xl items-center justify-between rounded-full border border-border/40 bg-background/80 px-4 py-2.5 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            scrolled ? "shadow-lg shadow-black/5 dark:shadow-black/20 translate-y-0" : "shadow-sm translate-y-2 sm:translate-y-4"
          }`}
        >
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 pl-2" aria-label="HealOS home">
            <HealOSLogo size={28} />
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden items-center gap-7 lg:flex">
            <Link href="/about" className="mono-label text-muted-foreground hover:text-foreground text-xs transition-colors">
              About
            </Link>
            <Link href="/features" className="mono-label text-muted-foreground hover:text-foreground text-xs transition-colors">
              Features
            </Link>
            <Link href="/testimonials" className="mono-label text-muted-foreground hover:text-foreground text-xs transition-colors">
              Testimonials
            </Link>
            <a href="#contact" className="mono-label text-muted-foreground hover:text-foreground text-xs transition-colors">
              Contact
            </a>
            <Link href="/patient" className="mono-label text-muted-foreground hover:text-foreground text-xs transition-colors">
              Patient Portal
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {!isAuthenticated && <ThemeToggle />}

            {isAuthenticated && user ? (
              <UserProfileMenu />
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className="mono-label text-muted-foreground hover:text-foreground px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Sign In
                </Link>
                <Link href="/register" className="group">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    className="relative flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90 cursor-pointer mono-label overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-1.5">
                      Get Started
                      <motion.span
                        initial={{ x: 0 }}
                        whileHover={{ x: 3 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        className="inline-block"
                      >
                        →
                      </motion.span>
                    </span>
                    <div className="absolute inset-0 z-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  </motion.button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-background/50 text-foreground transition-colors hover:bg-muted lg:hidden"
            >
              <div className="flex w-3.5 flex-col gap-1">
                <motion.span 
                  animate={{ rotate: open ? 45 : 0, y: open ? 5 : 0 }} 
                  className="h-px w-full bg-current transition-transform origin-center" 
                />
                <motion.span 
                  animate={{ opacity: open ? 0 : 1 }} 
                  className="h-px w-full bg-current transition-opacity" 
                />
                <motion.span 
                  animate={{ rotate: open ? -45 : 0, y: open ? -5 : 0 }} 
                  className="h-px w-full bg-current transition-transform origin-center" 
                />
              </div>
            </button>
          </div>
        </header>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-4 top-24 z-40 rounded-2xl border border-border/40 bg-background/95 p-6 shadow-2xl backdrop-blur-xl lg:hidden"
          >
            <nav className="flex flex-col gap-4">
              <Link href="/about" onClick={() => setOpen(false)} className="mono-label text-sm text-muted-foreground hover:text-foreground">About</Link>
              <Link href="/features" onClick={() => setOpen(false)} className="mono-label text-sm text-muted-foreground hover:text-foreground">Features</Link>
              <Link href="/testimonials" onClick={() => setOpen(false)} className="mono-label text-sm text-muted-foreground hover:text-foreground">Testimonials</Link>
              <a href="#contact" onClick={() => setOpen(false)} className="mono-label text-sm text-muted-foreground hover:text-foreground">Contact</a>
              <Link href="/patient" onClick={() => setOpen(false)} className="mono-label text-sm text-muted-foreground hover:text-foreground">Patient Portal</Link>
              
              {!isAuthenticated ? (
                <div className="mt-4 flex flex-col gap-3 border-t border-border/50 pt-4">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="mono-label w-full rounded-xl border border-border/50 bg-background px-4 py-3 text-sm font-semibold hover:bg-muted text-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="mono-label w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 text-center"
                  >
                    Get Started →
                  </Link>
                </div>
              ) : (
                <div className="mt-4 border-t border-border/50 pt-4">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); logout(); }}
                    className="mono-label w-full text-left text-sm text-destructive"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
