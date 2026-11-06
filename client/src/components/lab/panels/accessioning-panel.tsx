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
import {
  fetchLabSamplesApi,
  receiveLabSpecimenApi,
  rejectLabSpecimenApi,
  recollectLabSpecimenApi,
} from "@/lib/api/lab";
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
  const [filter, setFilter] = useState<
    "all" | "collected" | "received" | "recollection"
  >("all");
  const [now, setNow] = useState(() => Date.now());
  const [scans, setScans] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const visible = rows.filter((s) => {
    if (filter === "collected") return s.specimenStatus === "COLLECTED";
    if (filter === "received")
      return ["RECEIVED", "PROCESSING"].includes(s.specimenStatus);
    if (filter === "recollection")
      return s.specimenStatus === "RECOLLECTION_REQUIRED";
    return true;
  });

  const performSpecimenAction = async (
    order: any,
    action: "receive" | "reject" | "recollect",
  ) => {
    const barcode = (scans[order._id] || "").trim().toUpperCase();
    if (barcode !== order.specimenBarcode) {
      toast.error("Scan the active specimen barcode first.");
      return;
    }
    if (action === "reject" && !reasons[order._id]?.trim()) {
      toast.error("Enter why this sample is being rejected.");
      return;
    }
    setBusyId(order._id);
    try {
      if (action === "receive") await receiveLabSpecimenApi(order._id, barcode);
      if (action === "reject")
        await rejectLabSpecimenApi(
          order._id,
          barcode,
          reasons[order._id].trim(),
        );
      if (action === "recollect")
        await recollectLabSpecimenApi(order._id, barcode);
      setScans((previous) => ({ ...previous, [order._id]: "" }));
      setReasons((previous) => ({ ...previous, [order._id]: "" }));
      toast.success(
        action === "receive"
          ? "Specimen received and logged."
          : action === "reject"
            ? "Rejection recorded; a replacement barcode was issued."
            : "Recollection logged; specimen is ready for receipt.",
      );
      await loadSamples();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to update specimen custody.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <PanelHeader
        index="02 / accessioning"
        title="Accessioning &amp; sample flow"
        note="Scan every handoff. Rejections issue a replacement barcode, and custody events remain attached to the order."
        actions={
          <>
            <ActionButton onClick={() => setFilter("all")}>All</ActionButton>
            <ActionButton onClick={() => setFilter("collected")}>
              Collected
            </ActionButton>
            <ActionButton onClick={() => setFilter("received")}>
              Received / processing
            </ActionButton>
            <ActionButton
              tone="solid"
              onClick={() => setFilter("recollection")}
            >
              Recollection
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
              <Th>Specimen barcode</Th>
              <Th>Collected</Th>
              <Th>TAT / SLA</Th>
              <Th>Stage</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={9}
                  className="p-8 text-center text-muted-foreground"
                >
                  Loading samples...
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
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
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        <Barcode className="size-3.5" />
                        {s.specimenBarcode}
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
                        {[
                          "COLLECTED",
                          "RECEIVED",
                          "PROCESSING",
                          "RECOLLECTION_REQUIRED",
                        ].includes(s.specimenStatus) && <LiveDot />}
                        <Pill
                          tone={
                            s.specimenStatus === "COMPLETED"
                              ? "ok"
                              : s.specimenStatus === "RECOLLECTION_REQUIRED" ||
                                  s.specimenStatus === "CANCELLED"
                                ? "bad"
                                : "info"
                          }
                        >
                          {s.specimenStatus?.replaceAll("_", " ") || s.status}
                        </Pill>
                      </span>
                    </Td>
                    <Td>
                      {s.specimenStatus === "COLLECTED" && (
                        <div className="min-w-56 space-y-2">
                          <input
                            aria-label={`Scan received barcode ${s.specimenBarcode}`}
                            value={scans[s._id] || ""}
                            onChange={(event) =>
                              setScans((previous) => ({
                                ...previous,
                                [s._id]: event.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="Scan barcode to receive"
                            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
                          />
                          <div className="flex gap-2">
                            <ActionButton
                              tone="solid"
                              disabled={busyId === s._id}
                              onClick={() =>
                                performSpecimenAction(s, "receive")
                              }
                            >
                              <Check className="mr-1 inline size-3" />
                              Receive
                            </ActionButton>
                            <ActionButton
                              disabled={busyId === s._id}
                              onClick={() =>
                                setReasons((previous) => ({
                                  ...previous,
                                  [s._id]: previous[s._id] ?? "",
                                }))
                              }
                            >
                              <X className="mr-1 inline size-3" />
                              Reject
                            </ActionButton>
                          </div>
                          {reasons[s._id] !== undefined && (
                            <div className="space-y-2">
                              <input
                                aria-label="Specimen rejection reason"
                                value={reasons[s._id]}
                                onChange={(event) =>
                                  setReasons((previous) => ({
                                    ...previous,
                                    [s._id]: event.target.value,
                                  }))
                                }
                                placeholder="Reason for rejection"
                                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                              />
                              <ActionButton
                                disabled={busyId === s._id}
                                onClick={() =>
                                  performSpecimenAction(s, "reject")
                                }
                              >
                                Confirm rejection
                              </ActionButton>
                            </div>
                          )}
                        </div>
                      )}
                      {s.specimenStatus === "RECOLLECTION_REQUIRED" && (
                        <div className="min-w-56 space-y-2">
                          <input
                            aria-label={`Scan recollection barcode ${s.specimenBarcode}`}
                            value={scans[s._id] || ""}
                            onChange={(event) =>
                              setScans((previous) => ({
                                ...previous,
                                [s._id]: event.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="Scan replacement barcode"
                            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs"
                          />
                          <ActionButton
                            tone="solid"
                            disabled={busyId === s._id}
                            onClick={() =>
                              performSpecimenAction(s, "recollect")
                            }
                          >
                            Record recollection
                          </ActionButton>
                        </div>
                      )}
                      {s.specimenStatus === "RECEIVED" && (
                        <span className="text-xs text-muted-foreground">
                          Ready for analyzer assignment
                        </span>
                      )}
                      {s.specimenStatus === "PROCESSING" && (
                        <span className="text-xs text-muted-foreground">
                          Assigned to {s.analyser?.name || "analyser"}
                        </span>
                      )}
                      {s.specimenStatus === "COMPLETED" && (
                        <span className="text-xs text-muted-foreground">
                          Results submitted
                        </span>
                      )}
                    </Td>
                    <Td>
                      <details className="max-w-64 text-xs">
                        <summary className="cursor-pointer text-primary">
                          Custody history ({s.specimenHistory?.length || 0})
                        </summary>
                        <ol className="mt-2 space-y-2 border-l border-border pl-3">
                          {(s.specimenHistory || []).map(
                            (event: any, index: number) => (
                              <li key={`${event.at}-${index}`}>
                                <p className="font-medium">
                                  {event.event.replaceAll("_", " ")}
                                </p>
                                <p className="font-mono text-muted-foreground">
                                  {event.barcode || "—"} ·{" "}
                                  {new Date(event.at).toLocaleString()}
                                </p>
                                {event.note && (
                                  <p className="text-muted-foreground">
                                    {event.note}
                                  </p>
                                )}
                                <p className="text-muted-foreground">
                                  {event.performedBy?.name || "Lab staff"}
                                </p>
                              </li>
                            ),
                          )}
                        </ol>
                      </details>
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
