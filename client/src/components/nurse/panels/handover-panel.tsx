"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check, X, PauseCircle, TriangleAlert, Droplets, Bandage, Bell } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, Sparkline, StatGrid, Td, Th, type Tone } from "@/components/workspace/ui";
import { fetchNurseHandoversApi, type NurseHandover } from "@/lib/api/nurse";
import { toast } from "sonner";


/* ---------- 05 handover (real data) ---------- */

export function HandoverPanel() {
  const [notes, setNotes] = useState<NurseHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ bed: "", situation: "", recommendation: "" });

  useEffect(() => {
    fetchNurseHandoversApi()
      .then((data) => {
        setNotes(data.handovers);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load shift handovers");
        setLoading(false);
      });
  }, []);

  return (
    <section>
      <PanelHeader
        index="05 / handover"
        title="Shift handover"
        note="Structured SBAR per bed. Escalations sit at the top and carry to the incoming nurse with an acknowledgement."
        actions={<ActionButton tone="solid">Print bedside sheet</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-[1.6fr_1fr]" style={{ background: "var(--hairline)" }}>
        <div className="bg-background">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading handovers...</div>
          ) : notes.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No handover notes available.</div>
          ) : notes
            .slice()
            .sort((a, b) => (a.acuity === "critical" ? -1 : b.acuity === "critical" ? 1 : 0))
            .map((h) => (
              <div key={h.bed} className="hairline-b p-5 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="mono-label text-accent/80">{h.bed} · {h.patientName || "Unknown"}</p>
                  <Pill tone={h.acuity === "critical" ? "bad" : h.acuity === "guarded" ? "warn" : "ok"}>
                    {h.acuity}
                  </Pill>
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    ["S", h.situation],
                    ["B", h.background],
                    ["A", h.assessment],
                    ["R", h.recommendation],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <dt className="mono-label text-brass w-4 shrink-0">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
        </div>

        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">Add handover note</p>
          <input
            value={draft.bed}
            onChange={(e) => setDraft({ ...draft, bed: e.target.value })}
            placeholder="Bed (e.g. W3-12)"
            className="hairline mono-label mt-3 w-full bg-transparent px-3 py-2 outline-none"
          />
          <textarea
            value={draft.situation}
            onChange={(e) => setDraft({ ...draft, situation: e.target.value })}
            placeholder="Situation"
            rows={3}
            className="hairline mt-2 w-full resize-none bg-transparent px-3 py-2 text-sm outline-none"
          />
          <textarea
            value={draft.recommendation}
            onChange={(e) => setDraft({ ...draft, recommendation: e.target.value })}
            placeholder="Recommendation"
            rows={3}
            className="hairline mt-2 w-full resize-none bg-transparent px-3 py-2 text-sm outline-none"
          />
          <div className="mt-3">
            <ActionButton
              tone="solid"
              disabled={loading}
              onClick={async () => {
                if (!draft.bed.trim() || !draft.situation.trim()) {
                  toast.error("Bed and Situation are required");
                  return;
                }
                const bedRegex = /^[A-Za-z0-9-]+$/;
                if (!bedRegex.test(draft.bed.trim())) {
                  toast.error("Bed must contain only letters, numbers, and hyphens");
                  return;
                }
                
                try {
                  const { createHandoverApi, fetchNurseHandoversApi } = await import("@/lib/api/nurse");
                  const res = await createHandoverApi({
                    patientName: "New entry",
                    bed: draft.bed,
                    situation: draft.situation,
                    background: "—",
                    assessment: "—",
                    recommendation: draft.recommendation || "—",
                    acuity: "stable",
                  });
                  
                  if (res.success) {
                    toast.success("Handover note posted");
                    setDraft({ bed: "", situation: "", recommendation: "" });
                    const refreshed = await fetchNurseHandoversApi();
                    setNotes(refreshed.handovers);
                  }
                } catch (err) {
                  toast.error("Failed to post handover note");
                }
              }}
            >
              Post to handover
            </ActionButton>
          </div>
          <p className="mono-label text-muted-foreground mt-4">
            Outgoing: Current Nurse → Incoming: Next Nurse · shift handover
          </p>
        </div>
      </div>
    </section>
  );
}
