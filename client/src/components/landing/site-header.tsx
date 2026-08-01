"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/store/use-auth-store";
import { UserProfileMenu } from "@/components/auth/user-profile-menu";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const { isAuthenticated, user, openAuthModal, logout } = useAuthStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`bg-background/90 sticky top-0 z-50 backdrop-blur-md transition-colors ${
        scrolled ? "hairline-b shadow-sm" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2" aria-label="HealOS home">
          <HealOSLogo size={32} />
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden items-center gap-6 lg:flex">
          <a
            href="#features"
            className="mono-label text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Features
          </a>
          <Link
            href="/doctor"
            className="mono-label text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Clinicians
          </Link>
          <Link
            href="/patient"
            className="mono-label text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Patients
          </Link>
          <Link
            href="/radiology"
            className="mono-label text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Radiology
          </Link>
          <Link
            href="/admin"
            className="mono-label text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Console
          </Link>
          <Link
            href="/contact"
            className="mono-label text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Contact
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {!isAuthenticated && <ThemeToggle />}

          {isAuthenticated && user ? (
            <UserProfileMenu />
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="mono-label text-foreground hover:text-brass px-3.5 py-2 text-xs font-semibold transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="bg-primary text-primary-foreground mono-label px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 rounded-md cursor-pointer"
              >
                Get Started →
              </button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            className="hairline text-muted-foreground px-3 py-2 lg:hidden rounded-md"
          >
            <span className="mono-label text-xs">{open ? "Close" : "Menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <motion.nav
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="hairline-t bg-background overflow-hidden lg:hidden"
        >
          <div className="mx-auto max-w-[1400px] px-5 py-4 sm:px-8 space-y-2">
            <a
              href="#features"
              onClick={() => setOpen(false)}
              className="mono-label hairline-b text-muted-foreground block py-3 text-xs"
            >
              Features
            </a>
            <Link
              href="/doctor"
              onClick={() => setOpen(false)}
              className="mono-label hairline-b text-muted-foreground block py-3 text-xs"
            >
              Clinicians Workspace
            </Link>
            <Link
              href="/patient"
              onClick={() => setOpen(false)}
              className="mono-label hairline-b text-muted-foreground block py-3 text-xs"
            >
              Patient Portal
            </Link>
            <Link
              href="/radiology"
              onClick={() => setOpen(false)}
              className="mono-label hairline-b text-muted-foreground block py-3 text-xs"
            >
              Radiology & Imaging
            </Link>
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="mono-label hairline-b text-muted-foreground block py-3 text-xs"
            >
              Admin Console
            </Link>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mono-label hairline-b text-muted-foreground block py-3 text-xs"
            >
              Contact
            </Link>

            {!isAuthenticated ? (
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openAuthModal("login");
                  }}
                  className="mono-label bg-primary text-primary-foreground w-full py-3 text-xs font-semibold rounded-md"
                >
                  Sign In
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="mono-label text-destructive block py-3 text-xs"
              >
                Sign Out
              </button>
            )}
          </div>
        </motion.nav>
      )}
    </header>
  );
}
