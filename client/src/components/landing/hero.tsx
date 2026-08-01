"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VitalsInstrument } from "./illustrations";
import { useAuthStore } from "@/store/use-auth-store";
import { Calendar, Stethoscope, ArrowRight, ShieldCheck, Activity } from "lucide-react";

const readouts = [
  { k: "Beds live", v: "1 284", d: "94% utilisation" },
  { k: "Median triage", v: "3m 41s", d: "−52% vs baseline" },
  { k: "Sites synced", v: "37", d: "0 write conflicts" },
];

const ticker = [
  "A1 · intake queue 04",
  "B2 · triage acuity 2.1",
  "B4 · MRI slot 11:20",
  "C3 · theatre 3 sterile",
  "D1 · ward 82% occupied",
  "D5 · 14 discharges today",
  "LAB · 6 results pending",
  "RX · 0 interaction flags",
];

export function Hero() {
  const router = useRouter();
  const { isAuthenticated, user, openAuthModal } = useAuthStore();

  const handleBookAppointment = () => {
    if (!isAuthenticated) {
      openAuthModal("login");
    } else {
      router.push("/patient");
    }
  };

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="bg-graph-paper pointer-events-none absolute inset-0 opacity-60" />
      <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t to-transparent" />

      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
        {/* top measurement rule */}
        <div className="hairline-b flex items-center justify-between py-4">
          <span className="mono-label text-muted-foreground flex items-center gap-2">
            <span className="bg-emerald-500 inline-block h-2 w-2 rounded-full animate-ping" />
            Hospital Operating System · Active Clinical Grid
          </span>
          <span className="mono-label text-muted-foreground hidden sm:inline">
            ISO 27001 · HIPAA Compliant · 256-Bit Encrypted EHR
          </span>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-12">
          {/* headline column */}
          <div className="hairline-b lg:col-span-7 lg:border-b-0 lg:pr-14 lg:pb-24">
            <div className="pt-14 pb-12 lg:pt-24">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-emerald-600 dark:text-emerald-400 mono-label text-xs mb-6"
              >
                <Activity className="size-3.5" />
                <span>Next-Gen Healthcare Management & EHR</span>
              </motion.div>

              <h1 className="font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.95] font-bold tracking-[-0.03em]">
                {["Run the whole", "hospital from", "one instrument."].map((row, i) => (
                  <motion.span
                    key={row}
                    className="block overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.12 }}
                  >
                    <motion.span
                      className="block"
                      initial={{ y: "110%" }}
                      animate={{ y: "0%" }}
                      transition={{ duration: 0.85, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {i === 2 ? (
                        <>
                          one <span className="text-brass">instrument</span>.
                        </>
                      ) : (
                        row
                      )}
                    </motion.span>
                  </motion.span>
                ))}
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.55 }}
                className="text-muted-foreground mt-8 max-w-xl text-[1.0625rem] leading-relaxed"
              >
                HealOS connects patient scheduling, doctor consultations, DICOM radiology imaging, and hospital billing into one unified calibrated surface for clinicians and patients.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
                className="mt-10 flex flex-wrap items-center gap-4"
              >
                <button
                  type="button"
                  onClick={handleBookAppointment}
                  className="bg-primary text-primary-foreground mono-label group inline-flex items-center gap-2.5 px-6 py-4 rounded-md font-semibold text-xs transition-all hover:opacity-90 shadow-md cursor-pointer"
                >
                  <Calendar className="size-4 text-primary-foreground" />
                  Book Doctor Appointment
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </button>

                <Link
                  href="/onboarding"
                  className="hairline-t hairline-b border border-border/80 text-foreground hover:border-primary/40 bg-card/50 hover:bg-muted/60 mono-label inline-flex items-center gap-2 px-6 py-4 rounded-md font-semibold text-xs transition-colors"
                >
                  <Stethoscope className="size-4 text-emerald-500" />
                  Clinician Verification & Portal
                </Link>
              </motion.div>

              {/* Quick Feature Highlights */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-8 flex flex-wrap items-center gap-4 pt-6 border-t border-border/40 font-mono text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-500" /> Instant OTP Auth
                </span>
                <span className="flex items-center gap-1.5">
                  <Activity className="size-4 text-brass" /> Real-Time Telemetry
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4 text-primary" /> 24/7 Patient Booking
                </span>
              </motion.div>
            </div>
          </div>

          {/* instrument column */}
          <div className="lg:hairline-l lg:col-span-5 lg:pl-14">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35 }}
              className="pt-12 lg:pt-24"
            >
              <div className="plate p-5">
                <div className="mono-label text-muted-foreground mb-4 flex items-center justify-between">
                  <span>Ward telemetry</span>
                  <span className="text-brass animate-blink flex items-center gap-2">
                    <span className="bg-accent inline-block h-1.5 w-1.5" /> live
                  </span>
                </div>
                <VitalsInstrument className="h-40 w-full" />
              </div>

              <div className="mt-0">
                {readouts.map((r, i) => (
                  <motion.div
                    key={r.k}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.12 }}
                    className="hairline-b flex items-baseline justify-between gap-4 py-5"
                  >
                    <span className="mono-label text-muted-foreground">{r.k}</span>
                    <span className="text-right">
                      <span className="font-display block text-2xl font-bold tracking-tight">{r.v}</span>
                      <span className="mono-label text-brass">{r.d}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* live floor ticker */}
        <div className="hairline-t hairline-b relative overflow-hidden py-3">
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r to-transparent" />
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l to-transparent" />
          <motion.div
            className="flex w-max gap-10"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {[...ticker, ...ticker].map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="mono-label text-muted-foreground flex shrink-0 items-center gap-3"
              >
                <span className="bg-brass inline-block h-1 w-1" />
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* scroll cue */}
        <div className="flex items-center justify-center py-6">
          <motion.a
            href="#features"
            className="mono-label text-muted-foreground hover:text-foreground flex flex-col items-center gap-2 transition-colors"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span>Scroll</span>
            <span className="bg-accent/60 block h-8 w-px" />
          </motion.a>
        </div>
      </div>
    </section>
  );
}
