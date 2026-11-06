"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  X,
  Barcode,
  TriangleAlert,
  Search,
  Scan,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Filter,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { LiveDot, Pill, Td, Th } from "@/components/workspace/ui";
import {
  fetchLabSamplesApi,
  receiveLabSpecimenApi,
  rejectLabSpecimenApi,
  recollectLabSpecimenApi,
} from "@/lib/api/lab";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";

const COMMON_REJECTION_REASONS = [
  "Hemolyzed",
  "Clotted specimen",
  "Insufficient volume (QNS)",
  "Wrong tube type / additive",
  "Mislabeled / unlabeled",
  "Leaked in transit",
];

export function AccessioningPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "collected" | "received" | "recollection"
  >("all");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [scans, setScans] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // Rapid Accession Scanner at top
  const [rapidScanBarcode, setRapidScanBarcode] = useState("");
  const rapidScanInputRef = useRef<HTMLInputElement>(null);

  const loadSamples = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetchLabSamplesApi();
      if (res.success) {
        setRows(res.samples || []);
      }
    } catch {
      toast.error("Failed to load samples");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSamples();
    const clock = window.setInterval(() => setNow(Date.now()), 60_000);
    const socket = getSocket();
    if (socket) {
      const reload = () => loadSamples(true);
      socket.on("lab_collection_updated", reload);
      socket.on("lab_report_validated", reload);
      return () => {
        window.clearInterval(clock);
        socket.off("lab_collection_updated", reload);
        socket.off("lab_report_validated", reload);
      };
    }
    return () => window.clearInterval(clock);
  }, []);

  const counts = useMemo(() => {
    return {
      all: rows.length,
      collected: rows.filter((s) => s.specimenStatus === "COLLECTED").length,
      received: rows.filter((s) =>
        ["RECEIVED", "PROCESSING"].includes(s.specimenStatus),
      ).length,
      recollection: rows.filter(
        (s) => s.specimenStatus === "RECOLLECTION_REQUIRED",
      ).length,
    };
  }, [rows]);

  const visible = rows.filter((s) => {
    if (filter === "collected" && s.specimenStatus !== "COLLECTED")
      return false;
    if (
      filter === "received" &&
      !["RECEIVED", "PROCESSING"].includes(s.specimenStatus)
    )
      return false;
    if (
      filter === "recollection" &&
      s.specimenStatus !== "RECOLLECTION_REQUIRED"
    )
      return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const searchable =
        `${s.accessionNumber || ""} ${s.patient?.name || ""} ${s.patient?.mrn || ""} ${s.testName || ""} ${s.specimenBarcode || ""} ${s._id || ""}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }

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
          ? `Specimen ${barcode} received into central lab.`
          : action === "reject"
            ? `Specimen ${barcode} rejected. Replacement barcode issued.`
            : `Recollection recorded for ${barcode}. Ready for receipt.`,
      );
      await loadSamples(true);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to update specimen custody.",
      );
    } finally {
      setBusyId(null);
    }
  };

  // Top Rapid Scan handler
  const handleRapidScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = rapidScanBarcode.trim().toUpperCase();
    if (!barcode) return;

    const matched = rows.find(
      (s) =>
        s.specimenBarcode?.toUpperCase() === barcode &&
        s.specimenStatus === "COLLECTED",
    );

    if (!matched) {
      const alreadyReceived = rows.find(
        (s) =>
          s.specimenBarcode?.toUpperCase() === barcode &&
          ["RECEIVED", "PROCESSING"].includes(s.specimenStatus),
      );
      if (alreadyReceived) {
        toast.info(
          `Specimen ${barcode} is already received and in processing.`,
        );
      } else {
        toast.error(
          `No pending collected specimen found with barcode ${barcode}.`,
        );
      }
      setRapidScanBarcode("");
      return;
    }

    try {
      setBusyId(matched._id);
      await receiveLabSpecimenApi(matched._id, barcode);
      toast.success(
        `Rapid Scan: Specimen ${barcode} (${matched.testName}) received!`,
      );
      setRapidScanBarcode("");
      await loadSamples(true);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to receive specimen.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PanelHeader
        index="02 / accessioning"
        title="Accessioning & Specimen Custody"
        note="Scan every handoff into the central laboratory. Log physical acceptance, pre-analytical rejections, or replacement recalls."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadSamples(true)}
              disabled={isRefreshing}
              aria-label="Refresh accession queue"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 hover:bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Top Rapid Barcode Scanner Bar */}
      <div className="p-4 sm:px-6 bg-card/40 border-b border-border/60">
        <form
          onSubmit={handleRapidScan}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1">
            <Scan className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-primary" />
            <input
              ref={rapidScanInputRef}
              id="rapid-accession-barcode"
              aria-label="Rapid specimen barcode scanner"
              value={rapidScanBarcode}
              onChange={(e) =>
                setRapidScanBarcode(e.target.value.toUpperCase())
              }
              placeholder="Rapid Scan Barcode (point barcode gun & press Enter)..."
              autoComplete="off"
              className="w-full bg-background border border-border/80 rounded-xl pl-10 pr-4 py-2.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={!rapidScanBarcode.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Check className="size-4" />
            <span>Fast Receive</span>
          </button>
        </form>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 sm:px-6 border-b border-border/60 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Tabs with Live Badges */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
              filter === "all"
                ? "bg-foreground text-background font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>All Samples</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted/80 text-muted-foreground font-bold">
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("collected")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
              filter === "collected"
                ? "bg-amber-500 text-white font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Awaiting Receipt</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-600 font-bold">
              {counts.collected}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("received")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
              filter === "received"
                ? "bg-emerald-600 text-white font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Received &amp; Testing</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-600 font-bold">
              {counts.received}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter("recollection")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 ${
              filter === "recollection"
                ? "bg-rose-500 text-white font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Recollection Needed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-600 font-bold">
              {counts.recollection}
            </span>
          </button>
        </div>

        {/* Text Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            id="accession-search"
            aria-label="Search sample queue"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter accession, MRN, patient..."
            className="w-full bg-background border border-border/80 rounded-lg pl-9 pr-4 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/25"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Specimen Table with FIXED 9 COLUMNS in TH and TD */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead className="bg-muted/40 border-b border-border/70">
            <tr>
              <Th>Accession &amp; Req</Th>
              <Th>Patient &amp; MRN</Th>
              <Th>Discipline / Panel</Th>
              <Th>Specimen Barcode</Th>
              <Th>Collected At</Th>
              <Th>TAT / SLA</Th>
              <Th>Stage</Th>
              <Th>Custody Handoff</Th>
              <Th>Audit History</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td
                  colSpan={9}
                  className="p-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span className="font-mono text-xs">
                      Loading specimen records...
                    </span>
                  </div>
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="p-12 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Barcode className="size-8 text-muted-foreground/30 mb-1" />
                    <p className="font-medium text-foreground text-sm">
                      No specimens found
                    </p>
                    <p className="text-xs">
                      {search
                        ? "No samples match your search query."
                        : "No specimens match this filter."}
                    </p>
                  </div>
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
                const patientName = s.patient?.name || "Unknown Patient";
                const isBusy = busyId === s._id;
                const activeScan = scans[s._id] || "";
                const isBarcodeMatch =
                  activeScan.trim().toUpperCase() === s.specimenBarcode;

                return (
                  <tr
                    key={s._id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* 1. Accession */}
                    <Td className="whitespace-nowrap">
                      <p className="font-mono font-bold text-foreground">
                        {s.accessionNumber || s._id.slice(-8)}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        REQ-{s._id.slice(-6)}
                      </p>
                    </Td>

                    {/* 2. Patient */}
                    <Td>
                      <p className="font-semibold text-foreground">
                        {patientName}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        MRN: {s.patient?.mrn || "N/A"}
                      </p>
                    </Td>

                    {/* 3. Discipline / Panel */}
                    <Td>
                      <p className="font-medium text-foreground">
                        {s.testName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.testType || "Clinical Diagnostic"}
                      </p>
                    </Td>

                    {/* 4. Specimen Barcode */}
                    <Td className="whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 font-mono text-xs px-2 py-1 rounded bg-muted/60 border border-border/60">
                        <Barcode className="size-3.5 text-primary" />
                        <span className="font-bold">{s.specimenBarcode}</span>
                      </div>
                    </Td>

                    {/* 5. Collected At */}
                    <Td className="whitespace-nowrap font-mono text-xs">
                      {s.collectedAt ? (
                        <div>
                          <span>
                            {new Date(s.collectedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {new Date(s.collectedAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Not collected
                        </span>
                      )}
                    </Td>

                    {/* 6. TAT / SLA */}
                    <Td className="whitespace-nowrap font-mono text-xs">
                      <span
                        className={`font-bold ${breach ? "text-destructive" : ""}`}
                      >
                        {tat === null ? "—" : `${tat}′`}
                      </span>
                      <span className="text-muted-foreground text-[11px]">
                        {sla !== undefined ? ` / ${sla}′ SLA` : " / SLA —"}
                      </span>
                      {breach && (
                        <span className="block text-[10px] text-destructive font-semibold">
                          Target breached
                        </span>
                      )}
                    </Td>

                    {/* 7. Stage Status */}
                    <Td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
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
                                : s.specimenStatus === "COLLECTED"
                                  ? "warn"
                                  : "info"
                          }
                        >
                          {s.specimenStatus?.replaceAll("_", " ") || s.status}
                        </Pill>
                      </span>
                    </Td>

                    {/* 8. Custody Handoff Actions */}
                    <Td className="min-w-64">
                      {s.specimenStatus === "COLLECTED" && (
                        <div className="space-y-2 p-2 rounded-lg bg-card/60 border border-border/70">
                          <div className="relative">
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
                              className={`w-full rounded-md border bg-background px-2 py-1.5 font-mono text-xs outline-none transition-all ${
                                isBarcodeMatch
                                  ? "border-emerald-500 ring-1 ring-emerald-500/30"
                                  : "border-border"
                              }`}
                            />
                            {/* Fast-fill button for testing */}
                            {!isBarcodeMatch && (
                              <button
                                type="button"
                                onClick={() =>
                                  setScans((prev) => ({
                                    ...prev,
                                    [s._id]: s.specimenBarcode,
                                  }))
                                }
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-primary hover:underline"
                              >
                                Fill
                              </button>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                performSpecimenAction(s, "receive")
                              }
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <Check className="size-3.5" />
                              <span>Receive</span>
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                setReasons((previous) => ({
                                  ...previous,
                                  [s._id]: previous[s._id] ?? "",
                                }))
                              }
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md border border-rose-500/40 text-rose-600 hover:bg-rose-500/10 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <X className="size-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>

                          {reasons[s._id] !== undefined && (
                            <div className="mt-2 space-y-2 p-2 rounded-md bg-rose-500/5 border border-rose-500/20">
                              <p className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">
                                Specimen Rejection Reason:
                              </p>

                              {/* Quick Rejection Chips */}
                              <div className="flex flex-wrap gap-1">
                                {COMMON_REJECTION_REASONS.map((reason) => (
                                  <button
                                    key={reason}
                                    type="button"
                                    onClick={() =>
                                      setReasons((prev) => ({
                                        ...prev,
                                        [s._id]: reason,
                                      }))
                                    }
                                    className="px-1.5 py-0.5 rounded text-[10px] border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                                  >
                                    {reason}
                                  </button>
                                ))}
                              </div>

                              <input
                                aria-label="Specimen rejection reason input"
                                value={reasons[s._id]}
                                onChange={(event) =>
                                  setReasons((previous) => ({
                                    ...previous,
                                    [s._id]: event.target.value,
                                  }))
                                }
                                placeholder="Enter specific reason..."
                                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                              />

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isBusy || !reasons[s._id]?.trim()}
                                  onClick={() =>
                                    performSpecimenAction(s, "reject")
                                  }
                                  className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                                >
                                  Confirm Rejection &amp; Issue Barcode
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReasons((prev) => {
                                      const next = { ...prev };
                                      delete next[s._id];
                                      return next;
                                    })
                                  }
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {s.specimenStatus === "RECOLLECTION_REQUIRED" && (
                        <div className="space-y-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                          <p className="text-[10px] text-amber-600 font-semibold uppercase">
                            Replacement Barcode Required
                          </p>
                          <div className="relative">
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
                            {!isBarcodeMatch && (
                              <button
                                type="button"
                                onClick={() =>
                                  setScans((prev) => ({
                                    ...prev,
                                    [s._id]: s.specimenBarcode,
                                  }))
                                }
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-primary hover:underline"
                              >
                                Fill
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              performSpecimenAction(s, "recollect")
                            }
                            className="w-full py-1.5 px-3 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                          >
                            Record Recollection
                          </button>
                        </div>
                      )}

                      {s.specimenStatus === "RECEIVED" && (
                        <span className="text-xs text-muted-foreground font-medium">
                          ✓ In Lab · Ready for Auto-Analyzer
                        </span>
                      )}

                      {s.specimenStatus === "PROCESSING" && (
                        <span className="text-xs text-primary font-medium">
                          ⚙ Running on {s.analyser?.name || "Analyzer"}
                        </span>
                      )}

                      {s.specimenStatus === "COMPLETED" && (
                        <span className="text-xs text-emerald-600 font-medium">
                          ✓ Final Results Submitted
                        </span>
                      )}
                    </Td>

                    {/* 9. Custody History Details */}
                    <Td className="whitespace-nowrap">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-primary hover:underline font-medium">
                          Log ({s.specimenHistory?.length || 0})
                        </summary>
                        <div className="mt-2 space-y-1.5 p-3 rounded-lg bg-card border border-border shadow-xs max-w-xs text-left">
                          {(s.specimenHistory || []).map(
                            (event: any, index: number) => (
                              <div
                                key={`${event.at}-${index}`}
                                className="border-b border-border/40 pb-1.5 last:border-0"
                              >
                                <p className="font-semibold text-foreground text-[11px]">
                                  {event.event.replaceAll("_", " ")}
                                </p>
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  {event.barcode || "—"} ·{" "}
                                  {new Date(event.at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                                {event.note && (
                                  <p className="text-[10px] text-rose-600 dark:text-rose-400">
                                    {event.note}
                                  </p>
                                )}
                              </div>
                            ),
                          )}
                        </div>
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
