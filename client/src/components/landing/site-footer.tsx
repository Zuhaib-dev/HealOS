import Link from "next/link";
import { HealOSLogo } from "@/components/brand/heal-os-logo";

const columns = [
  {
    title: "Platform",
    links: [
      { label: "HealOS", href: "/" },
      { label: "Features", href: "/testimonials#features" },
      { label: "About", href: "/about" },
      { label: "Developers & API", href: "/developers" },
    ],
  },
  {
    title: "Portals",
    links: [
      { label: "Clinicians", href: "/doctor" },
      { label: "Patients", href: "/patient" },
      { label: "Radiology", href: "/radiology" },
      { label: "Console", href: "/admin" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign In", href: "/login" },
      { label: "Get Started →", href: "/register" },
    ],
  },
];
 
export function SiteFooter() {
  return (
    <footer className="relative">
      <div className="mx-auto max-w-350 px-5 sm:px-8">
        <div className="hairline-t grid grid-cols-2 gap-10 py-14 lg:grid-cols-12">
          <div className="col-span-2 lg:col-span-4">
            <HealOSLogo size={30} />
            <p className="text-muted-foreground mt-6 max-w-xs text-sm leading-relaxed">
              The hospital operating system. Built with clinicians, audited by regulators, deployed
              across 37 sites.
            </p>
            <p className="mono-label text-muted-foreground mt-8">
              Lat 12.9716 · Lon 77.5946 · UTC+5:30
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} className="lg:col-span-2 lg:col-start-auto">
              <p className="mono-label text-brass">{col.title}</p>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="col-span-2 lg:col-span-2">
            <p className="mono-label text-brass">Contact</p>
            <ul className="text-muted-foreground mt-5 space-y-3 text-sm">
              <li>hello@healos.health</li>
              <li>+1 (415) 555 0142</li>
              <li>24/7 clinical support line</li>
            </ul>
          </div>
        </div>

        <div className="hairline-t mono-label text-muted-foreground flex flex-wrap items-center justify-between gap-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span>© {new Date().getFullYear()} HealOS Systems</span>
            <span className="hidden sm:inline">·</span>
            <span>
              Crafted by{" "}
              <a
                href="https://zuhaibrashid.com"
                target="_blank"
                rel="noreferrer"
                className="text-foreground hover:text-primary transition-colors underline underline-offset-4 font-semibold"
              >
                Zuhaib Rashid
              </a>{" "}
              (Full Stack Developer)
            </span>
          </div>
          <span className="flex flex-wrap gap-6">
            <a href="#top" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#top" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#top" className="hover:text-foreground transition-colors">
              HIPAA 
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
