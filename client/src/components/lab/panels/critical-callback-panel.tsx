"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { TestTube, PhoneCall, Check, X, Barcode, TriangleAlert } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, StatGrid, Td, Th, type Tone } from "@/components/workspace/ui";
import {
  analysers,
  collections,
  criticalValues,
  labStats,
  pendingValidation,
  samples,
  type ResultLine,
  type Sample,
} from "./lab-data";

const stageTone: Record<Sample["stage"], Tone> = {
  accessioned: "info",
  "on-analyser": "warn",
  validated: "ok",
  released: "ok",
  rejected: "bad",
};

function flagTone(f: ResultLine["flag"]): Tone {
  return f === "critical" ? "bad" : f === "normal" ? "ok" : "warn";
}

/** Animated tube-rack glyph — hand-drawn SVG, no raster assets. */
function RackGlyph({ tubes }: { tubes: { colour: string; count: number }[] }) {
  const flat = tubes.flatMap((t) => Array.from({ length: t.count }, () => t.colour)).slice(0, 8);
  return (
    <svg viewBox="0 0 120 48" className="h-12 w-full">
      <line x1="4" y1="42" x2="116" y2="42" stroke="var(--hairline)" strokeWidth="1" />
      {flat.map((c, i) => (
        <g key={i}>
          <rect x={8 + i * 13} y="10" width="8" height="30" fill="none" stroke="var(--hairline)" />
          <motion.rect
            x={8 + i * 13}
            width="8"
            fill={c}
            opacity="0.7"
            initial={{ y: 40, height: 0 }}
            animate={{ y: 24, height: 16 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
          />
        </g>
      ))}
    </svg>
  );
}


/* ---------- 05 critical callback ---------- */

export function CriticalPanel() {
  const [rows, setRows] = useState(criticalValues);
  const [target, setTarget] = useState("");
  return (
    <section>
      <PanelHeader
        index="05 / closed loop"
        title="Critical-value callback"
        note="Every critical result must be phoned, read back and signed. Open items age visibly until the loop closes."
        actions={<ActionButton tone="solid">{rows.filter((r) => !r.readBack).length} open</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
        {rows.map((c) => (
          <div key={c.accession} className="bg-background p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="mono-label text-accent/80">{c.accession}</p>
              {!c.readBack && <LiveDot tone="bad" />}
            </div>
            <p className="mt-1 font-mono text-lg font-bold">{c.patient}</p>
            <p className="mono-label text-muted-foreground">{c.location}</p>

            <div className="hairline mt-4 p-4">
              <p className="mono-label text-muted-foreground">{c.analyte}</p>
              <p className="text-destructive mt-1 font-mono text-2xl font-bold">{c.value}</p>
              <p className="mono-label text-muted-foreground mt-1">detected {c.detected}</p>
            </div>

            {c.readBack ? (
              <p className="mono-label text-brass mt-4">
                Called {c.calledTo} at {c.calledAt} · read-back confirmed
              </p>
            ) : (
              <div className="mt-4">
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Clinician called"
                  className="hairline mono-label w-full bg-transparent px-3 py-2 outline-none"
                />
                <div className="mt-2 flex gap-2">
                  <ActionButton
                    tone="solid"
                    onClick={() =>
                      setRows((r) =>
                        r.map((x) =>
                          x.accession === c.accession
                            ? { ...x, readBack: true, calledTo: target || "on-call MO", calledAt: "now" }
                            : x,
                        ),
                      )
                    }
                  >
                    <PhoneCall className="mr-1 inline size-3" /> Mark called
                  </ActionButton>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-5 sm:px-8">
        <Card>
          <p className="mono-label text-muted-foreground">Callback compliance · rolling 30 days</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {[
              ["Called within 15 min", "98.2%"],
              ["Read-back documented", "100%"],
              ["Median time to call", "6m 12s"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="font-mono text-2xl font-bold">{v}</p>
                <p className="mono-label text-muted-foreground">{k}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
