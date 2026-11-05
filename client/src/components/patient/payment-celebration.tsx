"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";

const blooms = [
  { flower: "🌸", x: -250, y: -180, rotate: -32, delay: 0 },
  { flower: "🌼", x: -190, y: 110, rotate: 38, delay: 0.04 },
  { flower: "🌷", x: -130, y: -245, rotate: -24, delay: 0.08 },
  { flower: "🌺", x: -65, y: 180, rotate: 30, delay: 0.12 },
  { flower: "🌼", x: 5, y: -210, rotate: 24, delay: 0.02 },
  { flower: "🌸", x: 70, y: 190, rotate: -35, delay: 0.1 },
  { flower: "🌷", x: 145, y: -235, rotate: 36, delay: 0.06 },
  { flower: "🌺", x: 220, y: 100, rotate: -28, delay: 0.14 },
  { flower: "🌸", x: -285, y: -10, rotate: 28, delay: 0.16 },
  { flower: "🌼", x: 275, y: -45, rotate: -34, delay: 0.18 },
  { flower: "🌷", x: -175, y: -105, rotate: 42, delay: 0.2 },
  { flower: "🌺", x: 180, y: 155, rotate: -40, delay: 0.22 },
];

export function PaymentCelebration({
  active,
  onComplete,
}: {
  active: boolean;
  onComplete: () => void;
}) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(onComplete, 2600);
    return () => window.clearTimeout(timeout);
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          aria-live="polite"
          aria-label="Payment successful"
          className="pointer-events-none fixed inset-0 z-[120] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
        >
          {!reduceMotion &&
            blooms.map((bloom, index) => (
              <motion.span
                key={`${bloom.flower}-${index}`}
                aria-hidden="true"
                className="absolute left-1/2 top-[52%] select-none text-3xl drop-shadow-md sm:text-4xl"
                initial={{ opacity: 0, scale: 0.2, x: 0, y: 0, rotate: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0.2, 1.15, 0.9],
                  x: bloom.x,
                  y: bloom.y,
                  rotate: bloom.rotate,
                }}
                transition={{
                  duration: 2.1,
                  delay: bloom.delay,
                  ease: "easeOut",
                  times: [0, 0.2, 0.72, 1],
                }}
              >
                {bloom.flower}
              </motion.span>
            ))}

          <motion.div
            className="absolute left-1/2 top-[52%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-3xl border border-emerald-100 bg-white/95 px-7 py-5 text-center shadow-[0_20px_80px_rgba(15,23,42,0.18)] backdrop-blur-md dark:border-emerald-900 dark:bg-slate-950/95"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.75, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 260, damping: 20, delay: 0.08 }
            }
          >
            <motion.span
              className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              initial={reduceMotion ? false : { scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 320, damping: 16, delay: 0.18 }
              }
            >
              <Check className="size-6" strokeWidth={3} />
            </motion.span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-50">
                Payment confirmed
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                You’re all set. Thank you!
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
