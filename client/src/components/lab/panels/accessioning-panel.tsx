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
} from "../lab-data";

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


/* ---------- 02 accessioning ---------- */

export function AccessioningPanel() {
  const [rows, setRows] = useState(samples);
  const [filter, setFilter] = useState<"all" | "open" | "rejected">("all");
  const visible = rows.filter((s) =>
    filter === "all" ? true : filter === "rejected" ? s.stage === "rejected" : s.stage !== "released",
  );

  return (
    <section>
      <PanelHeader
        index="02 / accessioning"
        title="Accessioning &amp; sample flow"
        note="Every sample from receipt to release, with discipline routing, analyser allocation and turnaround against discipline SLA."
        actions={
          <>
            <ActionButton onClick={() => setFilter("all")}>All</ActionButton>
            <ActionButton onClick={() => setFilter("open")}>In progress</ActionButton>
            <ActionButton tone="solid" onClick={() => setFilter("rejected")}>Rejected</ActionButton>
          </>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-270">
          <thead className="hairline-b">
            <tr>
              <Th>Accession</Th>
              <Th>Patient</Th>
              <Th>Discipline / panel</Th>
              <Th>Analyser</Th>
              <Th>Received</Th>
              <Th>TAT / SLA</Th>
              <Th>Stage</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => {
              const breach = s.tatMin > s.slaMin;
              return (
                <tr key={s.accession} className="hairline-b hover:bg-foreground/2">
                  <Td>
                    <p className="mono-label">{s.accession}</p>
                    <p className="mono-label text-muted-foreground">{s.reqId}</p>
                  </Td>
                  <Td><p className="font-medium">{s.patient}</p></Td>
                  <Td>
                    <p>{s.panel}</p>
                    <p className="mono-label text-muted-foreground">{s.discipline}</p>
                  </Td>
                  <Td><span className="mono-label">{s.analyser}</span></Td>
                  <Td><span className="font-mono">{s.received}</span></Td>
                  <Td>
                    <span className={`font-mono ${breach ? "text-destructive" : ""}`}>{s.tatMin}′</span>
                    <span className="mono-label text-muted-foreground"> / {s.slaMin}′</span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      {s.stage === "on-analyser" && <LiveDot />}
                      <Pill tone={stageTone[s.stage]}>{s.stage}</Pill>
                    </span>
                    {s.rejectReason && <p className="mono-label text-destructive mt-1">{s.rejectReason}</p>}
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setRows((r) => r.map((x) => x.accession === s.accession ? { ...x, stage: "on-analyser" } : x))} className="hairline mono-label px-2.5 py-1.5">
                        <TestTube className="mr-1 inline size-3" /> Load
                      </button>
                      <button type="button" onClick={() => setRows((r) => r.map((x) => x.accession === s.accession ? { ...x, stage: "rejected", rejectReason: "Rejected at bench" } : x))} className="hairline mono-label text-destructive px-2.5 py-1.5">
                        <X className="mr-1 inline size-3" /> Reject
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
