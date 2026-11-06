"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { PhoneCall, Check, X, Barcode, TriangleAlert } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import {
  Card,
  LiveDot,
  Pill,
  StatGrid,
  Td,
  Th,
  type Tone,
} from "@/components/workspace/ui";
import { fetchLabSamplesApi } from "@/lib/api/lab";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";

/** Animated tube-rack glyph — hand-drawn SVG, no raster assets. */
function RackGlyph({ tubes }: { tubes: { colour: string; count: number }[] }) {
  const flat = tubes
    .flatMap((t) => Array.from({ length: t.count }, () => t.colour))
    .slice(0, 8);
  return (
    <svg viewBox="0 0 120 48" className="h-12 w-full">
      <line
        x1="4"
        y1="42"
        x2="116"
        y2="42"
        stroke="var(--hairline)"
        strokeWidth="1"
      />
      {flat.map((c, i) => (
        <g key={i}>
          <rect
            x={8 + i * 13}
            y="10"
            width="8"
            height="30"
            fill="none"
            stroke="var(--hairline)"
          />
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
  const [filter, setFilter] = useState<"all" | "open" | "cancelled">("all");
  const [now, setNow] = useState(() => Date.now());

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
    const clock = window.setInterval(() => setNow(Date.now()), 60_000);
    const socket = getSocket();
    if (socket) {
      socket.on("lab_collection_updated", loadSamples);
      socket.on("lab_report_validated", loadSamples);
      return () => {
        window.clearInterval(clock);
        socket.off("lab_collection_updated", loadSamples);
        socket.off("lab_report_validated", loadSamples);
      };
    }
    return () => window.clearInterval(clock);
  }, []);

  const visible = rows.filter((s) =>
    filter === "all"
      ? true
      : filter === "cancelled"
        ? s.status === "CANCELLED"
        : s.status === "IN_PROGRESS",
  );

  return (
    <section>
      <PanelHeader
        index="02 / accessioning"
        title="Accessioning &amp; sample flow"
        note="Pathology samples in progress, reported or cancelled. Analyzer assignment is not connected; turnaround uses recorded collection and result times."
        actions={
          <>
            <ActionButton onClick={() => setFilter("all")}>All</ActionButton>
            <ActionButton onClick={() => setFilter("open")}>
              In progress
            </ActionButton>
            <ActionButton tone="solid" onClick={() => setFilter("cancelled")}>
              Cancelled
            </ActionButton>
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
              <Th>Assignment</Th>
              <Th>Collected</Th>
              <Th>TAT / SLA</Th>
              <Th>Stage</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-muted-foreground"
                >
                  Loading samples...
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-muted-foreground"
                >
                  No samples found.
                </td>
              </tr>
            ) : (
              visible.map((s) => {
                const start = s.collectedAt
                  ? new Date(s.collectedAt).getTime()
                  : null;
                const end = s.reportedAt
                  ? new Date(s.reportedAt).getTime()
                  : now;
                const tat = start
                  ? Math.max(0, Math.floor((end - start) / 60_000))
                  : null;
                const sla = s.slaMin;
                const breach = tat !== null && sla !== undefined && tat > sla;
                const patientName = s.patient?.name || "Unknown";
                return (
                  <tr key={s._id} className="hairline-b hover:bg-foreground/2">
                    <Td>
                      <p className="mono-label">
                        {s.accessionNumber || s._id.slice(-8)}
                      </p>
                      <p className="mono-label text-muted-foreground">
                        REQ-{s._id.slice(-6)}
                      </p>
                    </Td>
                    <Td>
                      <p className="font-medium">{patientName}</p>
                    </Td>
                    <Td>
                      <p>{s.testName}</p>
                      <p className="mono-label text-muted-foreground">
                        {s.testType}
                      </p>
                    </Td>
                    <Td>
                      <span className="mono-label text-muted-foreground">
                        Not assigned
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono">
                        {s.collectedAt
                          ? new Date(s.collectedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "Not collected"}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={`font-mono ${breach ? "text-destructive" : ""}`}
                      >
                        {tat === null ? "—" : `${tat}′`}
                      </span>
                      <span className="mono-label text-muted-foreground">
                        {sla !== undefined ? ` / ${sla}′` : " / SLA —"}
                      </span>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-2">
                        {s.status === "IN_PROGRESS" && <LiveDot />}
                        <Pill
                          tone={
                            s.status === "REPORTED"
                              ? "ok"
                              : s.status === "CANCELLED"
                                ? "bad"
                                : "info"
                          }
                        >
                          {s.status}
                        </Pill>
                      </span>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
