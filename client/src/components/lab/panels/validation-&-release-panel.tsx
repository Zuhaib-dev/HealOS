"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle,
  TriangleAlert,
  Eye,
  RefreshCw,
  Search,
  Filter,
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { PanelHeader } from "@/components/admin/admin-shell";
import { Pill } from "@/components/workspace/ui";
import { fetchLabValidationApi, validateLabReportApi } from "@/lib/api/lab";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import { openProtectedReport } from "@/lib/api/reports";

export function ValidationPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "READY">("ALL");
  const [search, setSearch] = useState("");
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const loadValidation = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetchLabValidationApi();
      if (res.success) {
        setRows(res.pending || []);
      }
    } catch {
      toast.error("Failed to load validation queue");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadValidation();
    const socket = getSocket();
    if (socket) {
      const reload = () => loadValidation(true);
      socket.on("lab_report_validated", reload);
      socket.on("lab_critical_callback_recorded", reload);
      return () => {
        socket.off("lab_report_validated", reload);
        socket.off("lab_critical_callback_recorded", reload);
      };
    }
  }, []);

  const handleValidate = async (id: string) => {
    setValidatingId(id);
    try {
      const res = await validateLabReportApi(id);
      if (res.success) {
        toast.success(
          "Diagnostic report approved, signed, and released to patient portal!",
        );
        await loadValidation(true);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to validate report");
    } finally {
      setValidatingId(null);
    }
  };

  const metrics = useMemo(() => {
    const total = rows.length;
    const criticalBlocked = rows.filter(
      (r) => r.isCritical && !r.criticalCallback?.readBackConfirmed,
    ).length;
    const ready = rows.filter(
      (r) => !r.isCritical || r.criticalCallback?.readBackConfirmed,
    ).length;
    return { total, criticalBlocked, ready };
  }, [rows]);

  const visible = rows.filter((r) => {
    const isBlocked = r.isCritical && !r.criticalCallback?.readBackConfirmed;
    if (filter === "CRITICAL" && !r.isCritical) return false;
    if (filter === "READY" && isBlocked) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const text =
        `${r.patient?.name || r.emergencyCase?.patientName || ""} ${r.emergencyCase?.caseId || ""} ${r.patient?.mrn || ""} ${r.order?.testName || ""} ${r.order?.accessionNumber || ""} ${r._id || ""}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  return (
    <section className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PanelHeader
        index="04 / validation & release"
        title="Diagnostic Report Validation"
        note="Medical laboratory sign-off queue. Verify automated analyzer flags, delta checks, and critical values prior to patient and EHR release."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadValidation(true)}
              disabled={isRefreshing}
              aria-label="Refresh validation queue"
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

      {/* Metric Cards Bar */}
      <div className="p-4 sm:px-6 bg-card/40 border-b border-border/60">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl">
          <div className="p-3.5 rounded-xl border border-border/70 bg-card flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                Total Pending Sign-Off
              </p>
              <p className="font-mono text-xl font-bold text-foreground mt-0.5">
                {metrics.total}
              </p>
            </div>
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="size-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-rose-600 dark:text-rose-400 font-semibold">
                Critical · Read-Back Blocked
              </p>
              <p className="font-mono text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {metrics.criticalBlocked}
              </p>
            </div>
            <div className="size-9 rounded-lg bg-rose-500/20 text-rose-600 flex items-center justify-center">
              <TriangleAlert className="size-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                Ready for Release
              </p>
              <p className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {metrics.ready}
              </p>
            </div>
            <div className="size-9 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:px-6 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "ALL"
                ? "bg-foreground text-background font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            All Pending ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("CRITICAL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "CRITICAL"
                ? "bg-rose-600 text-white font-semibold shadow-xs"
                : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
            }`}
          >
            Critical Values ({rows.filter((r) => r.isCritical).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("READY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "READY"
                ? "bg-emerald-600 text-white font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            Ready to Sign ({metrics.ready})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            id="validation-search"
            aria-label="Search pending validation reports"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, accession, test..."
            className="w-full bg-background border border-border/80 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </div>

      {/* Reports List */}
      <div className="flex-1 p-4 sm:p-6 bg-muted/15 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <RefreshCw className="size-8 animate-spin text-primary mb-3" />
            <p className="font-mono text-sm">Loading validation queue...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground bg-card rounded-2xl border border-border/70 p-8">
            <ShieldCheck className="size-12 mb-3 opacity-30 text-primary" />
            <p className="font-bold text-foreground text-base">
              Validation Queue Clear
            </p>
            <p className="text-xs max-w-sm mt-1">
              All entered diagnostic reports have been verified and released to
              patient records.
            </p>
          </div>
        ) : (
          visible.map((p) => {
            const hasCritical = p.isCritical;
            const isReadBackConfirmed = p.criticalCallback?.readBackConfirmed;
            const isBlockedByCritical = hasCritical && !isReadBackConfirmed;
            const patientName =
              p.patient?.name ||
              p.emergencyCase?.patientName ||
              "Unknown Patient";
            const accession =
              p.order?.accessionNumber || p.order?._id?.slice(-8) || "N/A";
            const isValidating = validatingId === p._id;

            return (
              <div
                key={p._id}
                className={`bg-card rounded-2xl border transition-all p-5 sm:p-6 shadow-xs ${
                  isBlockedByCritical
                    ? "border-rose-500/40 ring-1 ring-rose-500/20"
                    : "border-border/80 hover:border-primary/40"
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                        {accession}
                      </span>
                      <h3 className="font-mono text-lg font-bold text-foreground">
                        {patientName}
                      </h3>
                      {p.patient?.mrn && (
                        <span className="text-xs text-muted-foreground font-mono">
                          MRN: {p.patient.mrn}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Order:{" "}
                      <strong className="text-foreground">
                        {p.order?.testName}
                      </strong>{" "}
                      · {p.order?.testType || "Laboratory Diagnostics"} ·
                      Created:{" "}
                      {new Date(p.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasCritical ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                        <TriangleAlert className="size-3.5" /> CRITICAL RESULT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        Routine Parameters
                      </span>
                    )}
                  </div>
                </div>

                {/* Critical Blocking Warning Banner */}
                {isBlockedByCritical && (
                  <div className="my-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <TriangleAlert className="size-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
                          Release Blocked: Panic Value Requires Clinician
                          Read-Back
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Hospital safety protocol mandates documented verbal
                          read-back before release.
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/lab/critical"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
                    >
                      <span>Go to Critical Callback</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                )}

                {/* Structured Results Table */}
                {p.structuredResults?.length ? (
                  <div className="my-4 overflow-x-auto rounded-xl border border-border/70">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="bg-muted/40 uppercase font-mono text-[10px] text-muted-foreground border-b border-border/60">
                        <tr>
                          <th className="p-3">Analyte Parameter</th>
                          <th className="p-3">Reported Result</th>
                          <th className="p-3">Reference Range</th>
                          <th className="p-3">Flag / Clinical Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {p.structuredResults.map(
                          (result: any, index: number) => {
                            const isCriticalFlag = String(
                              result.flag,
                            ).startsWith("CRITICAL");
                            const isHighLow =
                              result.flag === "HIGH" || result.flag === "LOW";

                            return (
                              <tr
                                key={`${result.analyteCode}-${index}`}
                                className={`transition-colors ${
                                  isCriticalFlag
                                    ? "bg-rose-500/5 font-semibold"
                                    : "hover:bg-muted/20"
                                }`}
                              >
                                <td className="p-3">
                                  <strong className="text-foreground text-sm">
                                    {result.analyteName}
                                  </strong>
                                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                                    {result.analyteCode}
                                  </span>
                                </td>

                                <td className="p-3 font-mono text-sm font-bold text-foreground">
                                  {result.value} {result.unit}
                                </td>

                                <td className="p-3 font-mono text-muted-foreground">
                                  {result.referenceLow ?? "—"} –{" "}
                                  {result.referenceHigh ?? "—"} {result.unit}
                                </td>

                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        isCriticalFlag
                                          ? "bg-rose-500 text-white"
                                          : isHighLow
                                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                            : result.flag === "NORMAL"
                                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                              : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {result.flag || "NORMAL"}
                                    </span>

                                    {result.previousValue !== undefined && (
                                      <span className="text-[11px] font-mono text-muted-foreground inline-flex items-center gap-1">
                                        <TrendingUp className="size-3 text-muted-foreground" />
                                        Prior: {result.previousValue} (Δ{" "}
                                        {result.deltaPercent ?? 0}%)
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="my-4 p-4 rounded-xl border border-border/60 bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
                    <span>
                      {p.fileUrl
                        ? "Diagnostic PDF report attached. Please review the document before signing release."
                        : "No structured chemistry or document attached."}
                    </span>
                  </div>
                )}

                {/* Footer Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {p.fileUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          openProtectedReport(p._id).catch(() =>
                            toast.error("Unable to open this report"),
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Eye className="size-3.5 text-primary" />
                        <span>View Report PDF</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isBlockedByCritical || isValidating}
                      onClick={() => handleValidate(p._id)}
                      className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isBlockedByCritical
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {isValidating ? (
                        <>
                          <RefreshCw className="size-3.5 animate-spin" />
                          <span>Validating &amp; Signing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="size-3.5" />
                          <span>Validate &amp; Release to Patient</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
