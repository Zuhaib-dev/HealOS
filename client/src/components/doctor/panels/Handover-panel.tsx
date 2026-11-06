"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Send } from "lucide-react";
import { DoctorHeader } from "@/components/doctor/doctor-header";
import { toast } from "sonner";
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
  return (
    <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>
  );
}

/* ---------- 07 · Handover ---------- */

export function HandoverPanel() {
  const [draft, setDraft] = useState("");
  const [handoversList, setHandoversList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHandovers = () => {
    setLoading(true);
    getHandoversApi()
      .then((res) => setHandoversList(res.data.handovers || []))
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
    } catch {
      toast.error("Failed to post handover");
    }
  };

  return (
    <div className="pb-24">
      <DoctorHeader
        title="Handover"
        note="What the last shift flagged, and what you want the next one to know."
      />
      <div className="grid lg:grid-cols-[1fr_360px]">
        <div className="hairline-l px-5 py-6 sm:px-8">
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading handovers...
            </p>
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
                    {new Date(h.createdAt).toLocaleString([], {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                  <span className="mono-label">
                    {h.fromDoctor?.name || "Unknown"}
                  </span>
                  {h.acuity === "critical" ? (
                    <Pill tone="bad">critical</Pill>
                  ) : null}
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">
                  {h.assessment}
                </p>
                {h.patient && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Patient: {h.patient.name}
                  </p>
                )}
              </motion.div>
            ))
          )}
        </div>
        <div className="hairline-l px-5 py-6">
          <label
            htmlFor="handover-note-draft"
            className="mono-label text-muted-foreground block"
          >
            Add handover note
          </label>
          <textarea
            id="handover-note-draft"
            aria-label="Add handover note"
            title="Add handover note"
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
