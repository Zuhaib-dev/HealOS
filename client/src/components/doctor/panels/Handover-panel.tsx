"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, TriangleAlert, PenLine, Send, X, CheckCircle2 } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { useAuthStore } from "@/store/use-auth-store";
import {
  fetchDoctorAppointmentsApi,
  updateAppointmentStatusApi,
  AppointmentRecord,
} from "@/lib/api/appointment";
import { toast } from "sonner";
import { saveConsultationApi, IMedicine } from "@/lib/api/doctor";
import { getHandoversApi, createHandoverApi } from "@/lib/api/doctor";

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

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

/** Animated vitals sparkline — drawn, never an image. */
function Vitals({ series }: { series: number[] }) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const pts = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * 100;
      const y = 30 - ((v - min) / Math.max(1, max - min)) * 26 - 2;
      return `${x},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-24 shrink-0">
      <motion.polyline
        points={pts}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}

function acuityPill(a: "critical" | "guarded" | "stable") {
  return a === "critical" ? (
    <Pill tone="bad">critical</Pill>
  ) : a === "guarded" ? (
    <Pill tone="warn">guarded</Pill>
  ) : (
    <Pill tone="ok">stable</Pill>
  );
}

/* ---------- 07 · Handover ---------- */

export function HandoverPanel() {
  const { user } = useAuthStore();
  const [draft, setDraft] = useState("");
  const [handoversList, setHandoversList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHandovers = () => {
    setLoading(true);
    getHandoversApi()
      .then(res => setHandoversList(res.data.handovers || []))
      .catch(() => toast.error("Failed to load handovers"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHandovers();
  }, []);

  const handlePost = async () => {
    if (!draft.trim()) return;
    try {
      await createHandoverApi({
        background: "Handover Note",
        assessment: draft.trim(),
      });
      setDraft("");
      fetchHandovers();
    } catch (err) {
      toast.error("Failed to post handover");
    }
  };

  return (
    <div>
      <PanelHeader
        index="07 / handover"
        title="Handover & messages"
        note="Everything the outgoing team flagged, plus what you want the next shift to know."
      />
      <div className="grid lg:grid-cols-[1fr_360px]">
        <div className="hairline-l px-5 py-6 sm:px-8">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading handovers...</p>
          ) : handoversList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No handovers found.</p>
          ) : (
            handoversList.map((h) => (
              <motion.div
                key={h._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="hairline-b py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="mono-label text-accent/80">
                    {new Date(h.createdAt).toLocaleString()}
                  </span>
                  <span className="mono-label">{h.fromDoctor?.name || "Unknown"}</span>
                  {h.acuity === "critical" ? <Pill tone="bad">critical</Pill> : null}
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{h.assessment}</p>
                {h.patient && <p className="mt-1 text-xs text-muted-foreground">Patient: {h.patient.name}</p>}
              </motion.div>
            ))
          )}
        </div>
        <div className="hairline-l px-5 py-6">
          <label htmlFor="handover-note-draft" className="mono-label text-muted-foreground block">
            Add handover note
          </label>
          <textarea
            id="handover-note-draft"
            aria-label="Add handover note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. ICU-A 04 — repeat ABG at 12:00, escalate if lactate rising"
            className="hairline placeholder:text-muted-foreground mt-3 min-h-32 w-full resize-y bg-transparent p-3 text-sm outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-sm"
          />
          <button
            type="button"
            onClick={handlePost}
            className="mono-label bg-foreground text-background mt-3 flex items-center gap-2 px-3.5 py-2 hover:opacity-90"
          >
            <Send className="size-3" /> Post to handover
          </button>
        </div>
      </div>
    </div>
  );
}
