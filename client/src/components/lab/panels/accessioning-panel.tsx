"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { TestTube, PhoneCall, Check, X, Barcode, TriangleAlert } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, StatGrid, Td, Th, type Tone } from "@/components/workspace/ui";
import { fetchLabSamplesApi } from "@/lib/api/lab";
import { getSocket } from "@/lib/socket";
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


/* ---------- 02 accessioning ---------- */

export function AccessioningPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "rejected">("all");

  const loadSamples = async () => {
    try {
      const res = await fetchLabSamplesApi();
      if (res.success) {
        setRows(res.samples);
      }
    } catch (e) {
      toast.error("Failed to load samples");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSamples();
    const socket = getSocket();
    if (socket) {
      socket.on("lab_collection_updated", loadSamples);
      socket.on("lab_report_validated", loadSamples);
      return () => {
        socket.off("lab_collection_updated", loadSamples);
        socket.off("lab_report_validated", loadSamples);
      };
    }
  }, []);

  const visible = rows.filter((s) =>
    filter === "all" ? true : filter === "rejected" ? s.status === "CANCELLED" : s.status !== "REPORTED",
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
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">Loading samples...</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">No samples found.</td>
              </tr>
            ) : visible.map((s) => {
              const tat = s.tatMin || 0;
              const sla = s.slaMin || 60;
              const breach = tat > sla;
              const patientName = s.patient?.name || "Unknown";
              return (
                <tr key={s._id} className="hairline-b hover:bg-foreground/2">
                  <Td>
                    <p className="mono-label">{s.accessionNumber || s._id.slice(-8)}</p>
                    <p className="mono-label text-muted-foreground">REQ-{s._id.slice(-6)}</p>
                  </Td>
                  <Td><p className="font-medium">{patientName}</p></Td>
                  <Td>
                    <p>{s.testName}</p>
                    <p className="mono-label text-muted-foreground">{s.testType}</p>
                  </Td>
                  <Td><span className="mono-label">—</span></Td>
                  <Td><span className="font-mono">{new Date(s.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></Td>
                  <Td>
                    <span className={`font-mono ${breach ? "text-destructive" : ""}`}>{tat}′</span>
                    <span className="mono-label text-muted-foreground"> / {sla}′</span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      {s.status === "IN_PROGRESS" && <LiveDot />}
                      <Pill tone={s.status === "REPORTED" ? "ok" : s.status === "CANCELLED" ? "bad" : "info"}>{s.status}</Pill>
                    </span>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <button type="button" className="hairline mono-label px-2.5 py-1.5" disabled>
                        <TestTube className="mr-1 inline size-3" /> Load
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
