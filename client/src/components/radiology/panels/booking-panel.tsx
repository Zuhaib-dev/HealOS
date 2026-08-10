import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  UploadCloud,
  FileText,
  X,
  Check,
  TriangleAlert,
  PhoneCall,
  Download,
  Share2,
  Trash2,
  Eye,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { useAuthStore } from "@/store/use-auth-store";
import { fetchBookingsApi, RadiologyBookingRecord } from "@/lib/api/radiology";
import { toast } from "sonner";

/* ---------- primitives ---------- */

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "bad" | "mute";
}) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>
  );
}

function Td({ children, colSpan, className }: { children?: React.ReactNode, colSpan?: number, className?: string }) {
  return <td colSpan={colSpan} className={`px-4 py-3.5 align-middle text-sm ${className || ""}`}>{children}</td>;
}

/** Animated scanner glyph — hand-drawn SVG, no raster assets. */
function ScannerGlyph({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 120 72" className="h-16 w-full">
      <rect
        x="8"
        y="12"
        width="104"
        height="48"
        fill="none"
        stroke="var(--hairline)"
        strokeWidth="1"
      />
      <circle cx="60" cy="36" r="17" fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="36" r="8" fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity="0.8" />
      {active && (
        <motion.line
          x1="8"
          x2="112"
          y1="14"
          y2="14"
          stroke="var(--color-accent)"
          strokeWidth="1.2"
          animate={{ y1: [14, 58, 14], y2: [14, 58, 14] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </svg>
  );
}

/* ---------- 07 booking ---------- */

export function BookingPanel() {
  const [bookings, setBookings] = useState<RadiologyBookingRecord[]>([]);

  useEffect(() => {
    fetchBookingsApi().then(res => setBookings(res.data.bookings)).catch(console.error);
  }, []);

  return (
    <section>
      <PanelHeader
        index="07 / scheduling"
        title="Slot booking"
        note="Room-by-room slot ladder with open capacity, blocked maintenance windows and booked studies."
        actions={<ActionButton tone="solid">New booking</ActionButton>}
      />

      <div className="flex flex-col gap-px" style={{ background: "var(--hairline)" }}>
        {bookings.length === 0 ? (
          <div className="bg-background p-8 text-center text-muted-foreground">Loading slots...</div>
        ) : bookings.map((s, i) => (
          <div
            key={`${s.time}-${s.room}-${i}`}
            className="bg-background flex flex-wrap items-center gap-4 px-5 py-4 sm:px-8"
          >
            <span className="mono-label text-brass w-14 shrink-0">{s.time}</span>
            <span className="mono-label text-muted-foreground w-16 shrink-0">{s.room}</span>
            <div className="min-w-0 flex-1">
              <p className={s.state === "open" ? "text-muted-foreground text-sm" : "text-sm"}>
                {s.study}
              </p>
              {s.patientName && s.patientName !== "—" && (
                <p className="mono-label text-muted-foreground mt-0.5">{s.patientName}</p>
              )}
            </div>
            <Pill tone={s.state === "booked" ? "warn" : s.state === "open" ? "ok" : "bad"}>
              {s.state}
            </Pill>
            <ActionButton>{s.state === "open" ? "Book" : "Reschedule"}</ActionButton>
          </div>
        ))}
      </div>
    </section>
  );
}
