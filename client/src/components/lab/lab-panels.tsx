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

/* ---------- 03 analyser worklist ---------- */

export function AnalyserPanel() {
  return (
    <section>
      <PanelHeader
        index="03 / bench"
        title="Analyser worklist"
        note="Instrument state, queue depth, throughput and QC currency. A failed QC blocks release from that analyser."
        actions={<ActionButton tone="solid">Run QC on all</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
        {analysers.map((a) => {
          const running = a.state === "running";
          return (
            <div key={a.id} className="bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-accent/80">{a.id}</p>
                  <p className="mt-1 font-mono text-lg font-bold">{a.name}</p>
                  <p className="mono-label text-muted-foreground">{a.discipline}</p>
                </div>
                <Pill tone={a.state === "fault" ? "bad" : a.state === "qc-due" ? "warn" : "ok"}>
                  {a.state}
                </Pill>
              </div>

              <svg viewBox="0 0 200 56" className="mt-4 h-14 w-full">
                <rect x="2" y="8" width="196" height="40" fill="none" stroke="var(--hairline)" />
                {Array.from({ length: 12 }).map((_, i) => (
                  <rect key={i} x={10 + i * 15} y="18" width="8" height="20" fill="none" stroke="var(--hairline)" />
                ))}
                {running && (
                  <motion.rect
                    y="10"
                    width="14"
                    height="36"
                    fill="var(--color-accent)"
                    opacity="0.18"
                    animate={{ x: [4, 182, 4] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </svg>

              <dl className="mono-label mt-3 space-y-1.5">
                <div className="flex justify-between"><dt className="text-muted-foreground">Queue</dt><dd>{a.queue} samples</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Throughput</dt><dd>{a.throughput}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Last QC pass</dt><dd>{a.qcLastPass}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Uptime 30d</dt><dd>{a.uptime}</dd></div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton>Open worklist</ActionButton>
                {a.state === "qc-due" && <ActionButton tone="solid">Run QC</ActionButton>}
                {a.state === "fault" && <ActionButton tone="solid">Log service call</ActionButton>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- 04 validation & release ---------- */

export function ValidationPanel() {
  const [released, setReleased] = useState<Record<string, boolean>>({});
  return (
    <section>
      <PanelHeader
        index="04 / validation"
        title="Validation &amp; release"
        note="Technical validation with delta checks against the previous result. Critical flags cannot be released without a callback."
        actions={<ActionButton tone="solid">Auto-verify normals</ActionButton>}
      />

      <div className="grid gap-px" style={{ background: "var(--hairline)" }}>
        {pendingValidation.map((p) => {
          const hasCritical = p.lines.some((l) => l.flag === "critical");
          return (
            <div key={p.accession} className="bg-background p-5 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-accent/80">{p.accession}</p>
                  <p className="mt-1 font-mono text-xl font-bold">{p.patient}</p>
                  <p className="mono-label text-muted-foreground">{p.panel} · {p.analyser}</p>
                </div>
                {hasCritical && (
                  <Pill tone="bad">
                    <TriangleAlert className="mr-1 inline size-3" />
                    critical value present
                  </Pill>
                )}
              </div>

              <div className="hairline mt-4 overflow-x-auto">
                <table className="w-full min-w-160">
                  <thead className="hairline-b">
                    <tr>
                      <Th>Analyte</Th>
                      <Th>Result</Th>
                      <Th>Reference</Th>
                      <Th>Delta</Th>
                      <Th>Flag</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.lines.map((l) => (
                      <tr key={l.analyte} className="hairline-b last:border-b-0">
                        <Td>{l.analyte}</Td>
                        <Td>
                          <span className={`font-mono text-base ${l.flag === "critical" ? "text-destructive" : ""}`}>
                            {l.value}
                          </span>
                          <span className="mono-label text-muted-foreground ml-1">{l.unit}</span>
                        </Td>
                        <Td><span className="mono-label text-muted-foreground">{l.ref}</span></Td>
                        <Td><span className="mono-label">{l.delta}</span></Td>
                        <Td><Pill tone={flagTone(l.flag)}>{l.flag}</Pill></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton tone="solid" onClick={() => setReleased((r) => ({ ...r, [p.accession]: true }))}>
                  {released[p.accession] ? "Released ✓" : "Validate & release"}
                </ActionButton>
                <ActionButton>Repeat on analyser</ActionButton>
                <ActionButton>Add interpretive comment</ActionButton>
              </div>
              {released[p.accession] && (
                <p className="mono-label text-brass mt-3">
                  <Check className="mr-1 inline size-3" />
                  Released to the ordering clinician and patient portal
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
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
