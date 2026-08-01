import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const nav = [
  { label: "Modules", href: "#modules" },
  { label: "Evidence", href: "#evidence" },
  { label: "Field notes", href: "#notes" },
  { label: "Questions", href: "#questions" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`bg-background/85 sticky top-0 z-50 backdrop-blur-md transition-colors ${
        scrolled ? "hairline-b" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-5 sm:px-8">
        <a href="#top" className="flex items-center" aria-label="HealOS home">
          <HealOSLogo size={30} />
        </a>

        <span className="mono-label text-muted-foreground hidden md:inline">v4.2 / rev 0918</span>

        <nav className="ml-auto hidden items-center gap-8 lg:flex">
          {nav.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              className="mono-label text-muted-foreground hover:text-foreground group relative transition-colors"
            >
              <span className="text-accent/70 mr-2">{String(i + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link
            href="/doctor"
            className="mono-label text-muted-foreground hover:text-foreground hidden px-2 transition-colors sm:inline-block"
          >
            Clinicians
          </Link>
          <Link
            href="/patient"
            className="mono-label text-muted-foreground hover:text-foreground hidden px-2 transition-colors sm:inline-block"
          >
            Patients
          </Link>
          <Link
            href="/radiology"
            className="mono-label text-muted-foreground hover:text-foreground hidden px-2 transition-colors lg:inline-block"
          >
            Radiology
          </Link>
          <Link
            href="/admin"
            className="mono-label text-muted-foreground hover:text-foreground hidden px-2 transition-colors sm:inline-block"
          >
            Console
          </Link>
          <Link
            href="/contact"
            className="mono-label text-muted-foreground hover:text-foreground hidden px-2 transition-colors sm:inline-block"
          >
            Contact
          </Link>
          <ThemeToggle />
          <a
            href="#access"
            className="bg-foreground text-background mono-label hidden px-4 py-2.5 transition-opacity hover:opacity-85 sm:inline-block"
          >
            Request access
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            className="hairline-t hairline-b text-muted-foreground px-3 py-2 lg:hidden"
          >
            <span className="mono-label">{open ? "Close" : "Menu"}</span>
          </button>
        </div>
      </div>

      {open && (
        <motion.nav
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="hairline-t overflow-hidden lg:hidden"
        >
          <div className="mx-auto max-w-[1400px] px-5 py-4 sm:px-8">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="mono-label hairline-b text-muted-foreground block py-4"
              >
                {item.label}
              </a>
            ))}
            <Link href="/contact" onClick={() => setOpen(false)} className="mono-label hairline-b text-muted-foreground block py-4">
              Contact
            </Link>
            <a href="#access" onClick={() => setOpen(false)} className="mono-label text-brass block py-4">
              Request access →
            </a>
          </div>
        </motion.nav>
      )}
    </header>
  );
}
