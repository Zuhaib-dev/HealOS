"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  TestTube,
  PhoneCall,
  Check,
  X,
  Barcode,
  TriangleAlert,
} from "lucide-react";
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
import { fetchLabValidationApi, validateLabReportApi } from "@/lib/api/lab";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import { openProtectedReport } from "@/lib/api/reports";
import { getFileUrl } from "@/lib/utils";
import { Eye } from "lucide-react";

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
      socket.on("lab_critical_callback_recorded", loadValidation);
      return () => {
        socket.off("lab_report_validated", loadValidation);
        socket.off("lab_critical_callback_recorded", loadValidation);
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
        note="Review the uploaded report before release. Critical results require a recorded clinician read-back."
      />

      <div className="grid gap-px" style={{ background: "var(--hairline)" }}>
        {loading ? (
          <div className="bg-background p-8 text-center text-muted-foreground">
            Loading validation queue...
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-background p-8 text-center text-muted-foreground">
            No reports pending validation.
          </div>
        ) : (
          rows.map((p) => {
            const hasCritical = p.isCritical;
            const patientName = p.patient?.name || "Unknown Patient";
            const accession =
              p.order?.accessionNumber || p.order?._id?.slice(-8) || "N/A";
            return (
              <div key={p._id} className="bg-background p-5 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="mono-label text-accent/80">{accession}</p>
                    <p className="mt-1 font-mono text-xl font-bold">
                      {patientName}
                    </p>
                    <p className="mono-label text-muted-foreground">
                      {p.order?.testName} · {p.order?.modality || "Lab"}
                    </p>
                  </div>
                  {hasCritical && (
                    <Pill tone="bad">
                      <TriangleAlert className="mr-1 inline size-3" />
                      critical value present
                    </Pill>
                  )}
                </div>

                {p.structuredResults?.length ? (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="p-3">Analyte</th>
                          <th className="p-3">Result</th>
                          <th className="p-3">Reference range</th>
                          <th className="p-3">Flag / delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.structuredResults.map(
                          (result: any, index: number) => (
                            <tr
                              key={`${result.analyteCode}-${index}`}
                              className="border-t border-border"
                            >
                              <td className="p-3">
                                <strong>{result.analyteName}</strong>
                                <span className="ml-2 font-mono text-xs text-muted-foreground">
                                  {result.analyteCode}
                                </span>
                              </td>
                              <td className="p-3 font-mono">
                                {result.value} {result.unit}
                              </td>
                              <td className="p-3">
                                {result.referenceLow ?? "—"}–
                                {result.referenceHigh ?? "—"} {result.unit}
                              </td>
                              <td className="p-3">
                                <Pill
                                  tone={
                                    String(result.flag).startsWith("CRITICAL")
                                      ? "bad"
                                      : result.flag === "HIGH" ||
                                          result.flag === "LOW" ||
                                          result.deltaExceeded
                                        ? "warn"
                                        : result.flag === "NORMAL"
                                          ? "ok"
                                          : "mute"
                                  }
                                >
                                  {result.flag}
                                </Pill>
                                {result.previousValue !== undefined && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    Prior {result.previousValue} · Δ{" "}
                                    {result.deltaPercent ?? 0}%
                                    {result.deltaExceeded ? " · review" : ""}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="hairline mt-4 rounded-lg p-4 text-sm text-muted-foreground">
                    {p.fileUrl
                      ? "Review the attached report document and verify values and reference ranges against the source."
                      : "No report document or structured results attached."}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton
                    tone="solid"
                    disabled={Boolean(
                      p.isCritical && !p.criticalCallback?.readBackConfirmed,
                    )}
                    onClick={() => handleValidate(p._id)}
                  >
                    Validate & release
                  </ActionButton>
                  {p.fileUrl && (
                    <ActionButton
                      onClick={() =>
                        openProtectedReport(p._id).catch(() =>
                          toast.error("Unable to open this report"),
                        )
                      }
                    >
                      <Eye className="mr-2 inline size-4" /> View PDF
                    </ActionButton>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
