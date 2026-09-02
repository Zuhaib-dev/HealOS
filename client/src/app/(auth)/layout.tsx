import { Suspense } from "react";
import { Metadata } from "next";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft } from "lucide-react";
import { GuestGuard } from "@/components/auth/guest-guard";

export const metadata: Metadata = {
  title: "Authenticate | HealOS",
  description: "Secure login and registration for HealOS, the operating system for healthcare.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Left Pane - Branding & Graphic */}
      <div className="relative hidden w-full flex-col lg:flex lg:w-1/2 overflow-hidden bg-emerald-950">
        {/* Background Graphic elements */}
        <div className="absolute inset-0 z-0 bg-graph-paper opacity-20 invert pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 z-0 h-1/2 bg-linear-to-t from-emerald-950 to-transparent pointer-events-none" />
        <div className="absolute -left-48 -top-48 z-0 h-160 w-160 rounded-full bg-emerald-500/20 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-1 flex-col justify-between p-12 lg:p-16">
          <Link href="/" className="inline-flex items-center gap-2 text-emerald-50 w-max">
            <HealOSLogo size={32} />
          </Link>
          
          <div className="max-w-md space-y-6 text-emerald-50">
            <h1 className="font-display text-[clamp(2.4rem,4vw,3.6rem)] font-bold tracking-tight leading-[1.05]">
              One calibrated surface for your entire hospital.
            </h1>
            <p className="text-emerald-200/80 leading-relaxed text-[1.125rem]">
              Connect patient scheduling, doctor consultations, DICOM imaging, and billing seamlessly.
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-emerald-300/60 font-mono text-xs">
            <span>ISO 27001 Certified</span>
            <span className="h-1 w-1 rounded-full bg-emerald-500/50" />
            <span>HIPAA Compliant</span>
            <span className="h-1 w-1 rounded-full bg-emerald-500/50" />
            <span>256-Bit Encrypted EHR</span>
          </div>
        </div>
      </div>

      {/* Right Pane - Auth Form */}
      <div className="relative flex w-full flex-1 flex-col justify-center bg-background px-5 py-12 sm:px-8 lg:w-1/2 lg:px-20 xl:px-24">
        {/* Back to Home (desktop) */}
        <Link
          href="/"
          className="absolute top-6 left-6 hidden lg:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors sm:top-8 sm:left-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-mono text-xs">Home</span>
        </Link>

        <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50 flex items-center gap-4">
          <ThemeToggle />
        </div>
        
        {/* Mobile Logo + Back Arrow */}
        <div className="absolute top-6 left-6 lg:hidden flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link href="/" className="inline-flex items-center gap-2">
            <HealOSLogo size={28} />
          </Link>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <Suspense
            fallback={
              <div className="w-full flex flex-col items-center justify-center py-12 space-y-4 text-xs mono-label text-muted-foreground animate-pulse">
                Validating workspace credentials...
              </div>
            }
          >
            <GuestGuard>{children}</GuestGuard>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

