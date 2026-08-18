"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { TestTube, PhoneCall, Check, X, Barcode, TriangleAlert } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, StatGrid, Td, Th, type Tone } from "@/components/workspace/ui";
import { fetchLabAnalysersApi } from "@/lib/api/lab";
import { toast } from "sonner";



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


/* ---------- 03 analyser worklist ---------- */

export function AnalyserPanel() {
  const [analysers, setAnalysers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalysers = async () => {
    try {
      const res = await fetchLabAnalysersApi();
      if (res.success) {
        setAnalysers(res.analysers);
      }
    } catch (e) {
      toast.error("Failed to load analysers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysers();
  }, []);

  return (
    <section>
      <PanelHeader
        index="03 / bench"
        title="Analyser worklist"
        note="Instrument state, queue depth, throughput and QC currency. A failed QC blocks release from that analyser."
        actions={<ActionButton tone="solid">Run QC on all</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
        {loading ? (
          <div className="bg-background p-8 text-center text-muted-foreground lg:col-span-2">Loading analysers...</div>
        ) : analysers.length === 0 ? (
          <div className="bg-background p-8 text-center text-muted-foreground lg:col-span-2">No analysers configured.</div>
        ) : analysers.map((a) => {
          const running = a.state === "running";
          return (
            <div key={a._id} className="bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-accent/80">{a._id.slice(-6).toUpperCase()}</p>
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
                <div className="flex justify-between"><dt className="text-muted-foreground">Queue</dt><dd>{a.queue || 0} samples</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Throughput</dt><dd>{a.throughput || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Last QC pass</dt><dd>{a.qcLastPass || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Uptime 30d</dt><dd>{a.uptime || "100%"}</dd></div>
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
