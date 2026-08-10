"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check, X, PauseCircle, TriangleAlert, Droplets, Bandage, Bell } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, Sparkline, StatGrid, Td, Th, type Tone } from "@/components/workspace/ui";
import {
  callBells,
  fluidBalance,
  handover,
  marDoses,
  shiftStats,
  wounds,
  type MarDose,
} from "../nurse-data";
import {
  fetchVitalsQueueApi,
  recordVitalsApi,
  VitalsQueueItem,
} from "@/lib/api/nurse";
import { toast } from "sonner";


/* ---------- 05 handover (mock data) ---------- */

export function HandoverPanel() {
  const [notes, setNotes] = useState(handover);
  const [draft, setDraft] = useState({ bed: "", situation: "", recommendation: "" });

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
          {notes
            .slice()
            .sort((a, b) => (a.priority === "escalate" ? -1 : b.priority === "escalate" ? 1 : 0))
            .map((h) => (
              <div key={h.bed} className="hairline-b p-5 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="mono-label text-accent/80">{h.bed} · {h.patient}</p>
                  <Pill tone={h.priority === "escalate" ? "bad" : h.priority === "watch" ? "warn" : "ok"}>
                    {h.priority}
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
              onClick={() => {
                if (!draft.bed.trim() || !draft.situation.trim()) return;
                setNotes((n) => [
                  {
                    bed: draft.bed,
                    patient: "New entry",
                    situation: draft.situation,
                    background: "—",
                    assessment: "—",
                    recommendation: draft.recommendation || "—",
                    priority: "watch",
                  },
                  ...n,
                ]);
                setDraft({ bed: "", situation: "", recommendation: "" });
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
