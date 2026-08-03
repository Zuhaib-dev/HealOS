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


/* ---------- 01 collection ---------- */

export function CollectionPanel() {
  const [rows, setRows] = useState(collections);
  return (
    <section>
      <PanelHeader
        index="01 / phlebotomy"
        title="Sample collection"
        note="Collection round by location with the exact tube set, fasting requirement and priority. Print labels at the bedside."
        actions={<ActionButton tone="solid">Print round labels</ActionButton>}
      />

      <StatGrid stats={labStats} />

      <div className="hairline-t grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
        {rows.map((c) => (
          <div key={c.id} className="bg-background p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mono-label text-accent/80">{c.id} · {c.location}</p>
                <p className="mt-1 font-mono text-lg font-bold">{c.patient}</p>
                <p className="mono-label text-muted-foreground">{c.mrn} · requested {c.requested}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Pill tone={c.priority === "stat" ? "bad" : c.priority === "urgent" ? "warn" : "mute"}>
                  {c.priority}
                </Pill>
                {c.fasting && <Pill tone="info">fasting</Pill>}
              </div>
            </div>

            <p className="mt-3 text-sm">{c.tests}</p>

            <div className="mt-3">
              <RackGlyph tubes={c.tubes} />
              <div className="mono-label text-muted-foreground flex flex-wrap gap-3">
                {c.tubes.map((t) => (
                  <span key={t.type}>{t.count} × {t.type}</span>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton
                tone="solid"
                onClick={() => setRows((r) => r.map((x) => (x.id === c.id ? { ...x, collected: true } : x)))}
              >
                {c.collected ? "Collected ✓" : "Mark collected"}
              </ActionButton>
              <ActionButton>
                <Barcode className="mr-1 inline size-3" /> Scan tube
              </ActionButton>
              <ActionButton>Unable to collect</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
