"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { TestTube, PhoneCall, Check, X, Barcode, TriangleAlert } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, StatGrid, Td, Th, type Tone } from "@/components/workspace/ui";
import { fetchLabValidationApi, validateLabReportApi } from "@/lib/api/lab";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import { getFileUrl } from "@/lib/utils";
import { Eye } from "lucide-react";



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


/* ---------- 04 validation & release ---------- */

export function ValidationPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadValidation = async () => {
    try {
      const res = await fetchLabValidationApi();
      if (res.success) {
        setRows(res.pending);
      }
    } catch (e) {
      toast.error("Failed to load validation queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValidation();
    const socket = getSocket();
    if (socket) {
      socket.on("lab_report_validated", loadValidation);
      return () => {
        socket.off("lab_report_validated", loadValidation);
      };
    }
  }, []);

  const handleValidate = async (id: string) => {
    try {
      const res = await validateLabReportApi(id);
      if (res.success) {
        toast.success("Validated and released");
        loadValidation();
      }
    } catch (e) {
      toast.error("Failed to validate report");
    }
  };

  return (
    <section>
      <PanelHeader
        index="04 / validation"
        title="Validation &amp; release"
        note="Technical validation with delta checks against the previous result. Critical flags cannot be released without a callback."
        actions={<ActionButton tone="solid">Auto-verify normals</ActionButton>}
      />

      <div className="grid gap-px" style={{ background: "var(--hairline)" }}>
        {loading ? (
          <div className="bg-background p-8 text-center text-muted-foreground">Loading validation queue...</div>
        ) : rows.length === 0 ? (
          <div className="bg-background p-8 text-center text-muted-foreground">No reports pending validation.</div>
        ) : rows.map((p) => {
          const hasCritical = p.isCritical;
          const patientName = p.patient?.name || "Unknown Patient";
          const accession = p.order?.accessionNumber || p.order?._id?.slice(-8) || "N/A";
          const lines = [
            { analyte: p.order?.testName || "Analyte", value: p.findings || "See report", unit: "", ref: "—", delta: "—", flag: p.isCritical ? "critical" : "normal" }
          ];

          return (
            <div key={p._id} className="bg-background p-5 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-accent/80">{accession}</p>
                  <p className="mt-1 font-mono text-xl font-bold">{patientName}</p>
                  <p className="mono-label text-muted-foreground">{p.order?.testName} · {p.order?.modality || "Lab"}</p>
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
                    {lines.map((l) => (
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
                        <Td><Pill tone={l.flag === "critical" ? "bad" : l.flag === "normal" ? "ok" : "warn"}>{l.flag}</Pill></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton tone="solid" onClick={() => handleValidate(p._id)}>
                  Validate & release
                </ActionButton>
                {p.fileUrl && (
                  <ActionButton onClick={() => window.open(getFileUrl(p.fileUrl), "_blank")}>
                    <Eye className="mr-2 inline size-4" /> View PDF
                  </ActionButton>
                )}
                <ActionButton>Repeat on analyser</ActionButton>
                <ActionButton>Add interpretive comment</ActionButton>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
