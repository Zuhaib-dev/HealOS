"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  Check,
  X,
  Barcode,
  TriangleAlert,
  Plus,
  RefreshCw,
  Copy,
  Cpu,
  Layers,
  Sparkles,
  ClipboardList,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { LiveDot, Pill } from "@/components/workspace/ui";
import {
  fetchLabAnalysersApi,
  fetchLabSamplesApi,
  fetchLabAnalytesApi,
  createLabAnalyserApi,
  updateLabAnalyserApi,
  rotateLabAnalyserTokenApi,
  recordLabAnalyserQCApi,
  assignLabAnalyserWorklistApi,
  saveLabAnalyteApi,
  submitLabResultsApi,
} from "@/lib/api/lab";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

export function AnalyserPanel() {
  const [analysers, setAnalysers] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [analytes, setAnalytes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAnalyteDefsOpen, setIsAnalyteDefsOpen] = useState(false);
  const [newAnalyser, setNewAnalyser] = useState({ name: "", discipline: "" });
  const [integrationToken, setIntegrationToken] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<
    Record<string, string[]>
  >({});
  const [controlLots, setControlLots] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // Manual Result Entry Modal / Drawer state
  const [manualOrder, setManualOrder] = useState<any | null>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [manualResults, setManualResults] = useState<
    { analyteCode: string; value: string }[]
  >([{ analyteCode: "", value: "" }]);

  // Analyte definition form
  const [analyteSearch, setAnalyteSearch] = useState("");
  const [analyteForm, setAnalyteForm] = useState({
    code: "",
    name: "",
    unit: "",
    referenceLow: "",
    referenceHigh: "",
    criticalLow: "",
    criticalHigh: "",
    deltaPercent: "",
  });

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const [analyserRes, sampleRes, analyteRes] = await Promise.all([
        fetchLabAnalysersApi(),
        fetchLabSamplesApi(),
        fetchLabAnalytesApi(),
      ]);
      setAnalysers(analyserRes.analysers || []);
      setSamples(sampleRes.samples || []);
      setAnalytes(analyteRes.analytes || []);
    } catch {
      toast.error("Failed to load analyser worklists");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const socket = getSocket();
    if (socket) {
      const reload = () => loadData(true);
      socket.on("lab_analyser_updated", reload);
      socket.on("lab_collection_updated", reload);
      socket.on("lab_results_imported", reload);
      return () => {
        socket.off("lab_analyser_updated", reload);
        socket.off("lab_collection_updated", reload);
        socket.off("lab_results_imported", reload);
      };
    }
  }, []);

  const createAnalyser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newAnalyser.name.trim() || !newAnalyser.discipline.trim()) return;
    setBusyId("new");
    try {
      const result = await createLabAnalyserApi(newAnalyser);
      setIntegrationToken(result.integrationToken);
      setNewAnalyser({ name: "", discipline: "" });
      setIsAddOpen(false);
      toast.success(
        "Analyzer instrument added. Copy its integration token now.",
      );
      await loadData(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to add analyser.");
    } finally {
      setBusyId(null);
    }
  };

  const recordQC = async (analyserId: string, passed: boolean) => {
    const controlLot = controlLots[analyserId]?.trim();
    if (!controlLot) {
      toast.error("Enter the control lot before recording QC.");
      return;
    }
    setBusyId(analyserId);
    try {
      await recordLabAnalyserQCApi(analyserId, { passed, controlLot });
      toast.success(
        passed
          ? "QC pass recorded! Instrument ready for sample runs."
          : "QC failure recorded. Automated device imports blocked.",
      );
      await loadData(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to record QC.");
    } finally {
      setBusyId(null);
    }
  };

  const assignWorklist = async (analyserId: string) => {
    const orderIds = selectedOrders[analyserId] || [];
    if (!orderIds.length) {
      toast.error("Select received specimens to assign to this analyzer.");
      return;
    }
    setBusyId(analyserId);
    try {
      const result = await assignLabAnalyserWorklistApi(analyserId, orderIds);
      toast.success(
        `${result.assigned || orderIds.length} specimen(s) assigned.`,
      );
      setSelectedOrders((previous) => ({ ...previous, [analyserId]: [] }));
      await loadData(true);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to assign specimens.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const rotateToken = async (analyserId: string) => {
    try {
      const result = await rotateLabAnalyserTokenApi(analyserId);
      setIntegrationToken(result.integrationToken);
      toast.success(
        "New token generated. The previous token has been invalidated.",
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to rotate token.");
    }
  };

  const copyTokenToClipboard = () => {
    if (integrationToken) {
      navigator.clipboard.writeText(integrationToken);
      toast.success("Integration token copied to clipboard!");
    }
  };

  const submitManual = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!manualOrder) return;
    if (manualBarcode.trim().toUpperCase() !== manualOrder.specimenBarcode) {
      toast.error("Barcode does not match the specimen barcode.");
      return;
    }

    try {
      await submitLabResultsApi(
        manualOrder._id,
        manualBarcode.trim(),
        manualResults.map((row) => ({
          analyteCode: row.analyteCode,
          value: Number(row.value),
        })),
      );
      toast.success("Structured results recorded! Sent to Validation queue.");
      setManualOrder(null);
      setManualBarcode("");
      setManualResults([{ analyteCode: "", value: "" }]);
      await loadData(true);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to save manual results.",
      );
    }
  };

  const saveAnalyte = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await saveLabAnalyteApi({ ...analyteForm });
      setAnalyteForm({
        code: "",
        name: "",
        unit: "",
        referenceLow: "",
        referenceHigh: "",
        criticalLow: "",
        criticalHigh: "",
        deltaPercent: "",
      });
      toast.success("Analyte definition & reference ranges saved.");
      await loadData(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to save analyte.");
    }
  };

  const filteredAnalytes = useMemo(() => {
    if (!analyteSearch.trim()) return analytes;
    const q = analyteSearch.trim().toLowerCase();
    return analytes.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        a.code?.toLowerCase().includes(q) ||
        a.unit?.toLowerCase().includes(q),
    );
  }, [analytes, analyteSearch]);

  return (
    <section className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PanelHeader
        index="03 / bench & automation"
        title="Auto-Analyzers & Batch Worklists"
        note="Manage clinical analyzers (Cobas, Sysmex, Abbott), assign received barcodes to batch carousels, monitor 24h QC, and bridge instrument LIS interfaces."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              aria-label="Refresh analyzers"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 hover:bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAnalyteDefsOpen((p) => !p)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isAnalyteDefsOpen
                  ? "bg-foreground text-background font-semibold"
                  : "border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Analyte Limits ({analytes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddOpen((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-3.5" />
              <span>Add Analyzer</span>
            </button>
          </div>
        }
      />

      {/* Add Analyzer Drawer / Collapsible */}
      <AnimatePresence>
        {isAddOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 sm:px-6 bg-card border-b border-border/70"
          >
            <form
              onSubmit={createAnalyser}
              className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] max-w-4xl"
            >
              <input
                required
                aria-label="Analyzer name"
                value={newAnalyser.name}
                onChange={(event) =>
                  setNewAnalyser((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                placeholder="Analyzer Name (e.g. Sysmex XN-1000)"
                className="rounded-lg border border-border/80 bg-background px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/25"
              />
              <input
                required
                aria-label="Analyzer discipline"
                value={newAnalyser.discipline}
                onChange={(event) =>
                  setNewAnalyser((previous) => ({
                    ...previous,
                    discipline: event.target.value,
                  }))
                }
                placeholder="Discipline (e.g. Hematology, Biochemistry)"
                className="rounded-lg border border-border/80 bg-background px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/25"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busyId === "new"}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Save Instrument
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Integration Token Banner */}
      {integrationToken && (
        <div className="p-4 sm:px-6 bg-amber-500/10 border-b border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <TriangleAlert className="size-4 shrink-0 text-amber-600" />
              <span>Copy New Analyzer Secret Token (Shown Only Once)</span>
            </p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate max-w-xl">
              {integrationToken}
            </p>
          </div>
          <button
            type="button"
            onClick={copyTokenToClipboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs cursor-pointer shrink-0"
          >
            <Copy className="size-3.5" />
            <span>Copy Token</span>
          </button>
        </div>
      )}

      {/* Analyte Limits & References Accordion */}
      <AnimatePresence>
        {isAnalyteDefsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 sm:px-6 bg-card/60 border-b border-border/70 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-mono text-sm font-bold text-foreground">
                  Analyte Definitions &amp; Clinical Reference Limits
                </h3>
                <p className="text-xs text-muted-foreground">
                  Reference intervals, panic critical cutoffs, and delta-check
                  tolerances for auto-flagging.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  aria-label="Search analytes"
                  value={analyteSearch}
                  onChange={(e) => setAnalyteSearch(e.target.value)}
                  placeholder="Filter analytes..."
                  className="w-full bg-background border border-border/80 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            </div>

            {/* Quick Add Form */}
            <form
              onSubmit={saveAnalyte}
              className="p-3 rounded-xl border border-border/70 bg-background/50 space-y-3"
            >
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
                {(
                  [
                    ["code", "Code (e.g. HGB)"],
                    ["name", "Analyte Name"],
                    ["unit", "Unit (g/dL)"],
                    ["referenceLow", "Ref Low"],
                    ["referenceHigh", "Ref High"],
                    ["criticalLow", "Panic Low"],
                    ["criticalHigh", "Panic High"],
                    ["deltaPercent", "Delta % Alert"],
                  ] as const
                ).map(([key, label]) => (
                  <input
                    key={key}
                    required={["code", "name", "unit"].includes(key)}
                    type={
                      key.includes("Low") ||
                      key.includes("High") ||
                      key === "deltaPercent"
                        ? "number"
                        : "text"
                    }
                    step="any"
                    value={analyteForm[key]}
                    onChange={(e) =>
                      setAnalyteForm((p) => ({ ...p, [key]: e.target.value }))
                    }
                    placeholder={label}
                    className="w-full rounded-md border border-border/80 bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                  />
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-xs"
                >
                  Save Analyte
                </button>
              </div>
            </form>

            {/* Analyte List */}
            <div className="max-h-56 overflow-y-auto grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAnalytes.map((item) => (
                <div
                  key={item.code}
                  className="p-2.5 rounded-lg border border-border/70 bg-card text-xs flex flex-col justify-between shadow-2xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-foreground">{item.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase">
                        {item.code} · {item.unit}
                      </p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted font-mono">
                      {item.referenceLow ?? "?"} – {item.referenceHigh ?? "?"}
                    </span>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-border/50 flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>
                      Critical: {item.criticalLow ?? "—"} /{" "}
                      {item.criticalHigh ?? "—"}
                    </span>
                    <span>
                      Δ {item.deltaPercent ? `${item.deltaPercent}%` : "off"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Analyzer Grid */}
      <div className="flex-1 p-4 sm:p-6 bg-muted/15">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Activity className="size-8 animate-spin text-primary mb-3" />
            <p className="font-mono text-sm">Loading instrument worklists...</p>
          </div>
        ) : analysers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
            <Cpu className="size-12 mb-3 opacity-30 text-primary" />
            <p className="font-bold text-foreground text-base">
              No Analyzers Configured
            </p>
            <p className="text-xs max-w-sm mt-1 mb-4">
              Connect automated bench analyzers like hematology counters,
              clinical chemistry analyzers, or immunoassay platforms.
            </p>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90"
            >
              Add First Analyzer
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {analysers.map((a) => {
              const receivedSamples = samples.filter(
                (sample) => sample.specimenStatus === "RECEIVED",
              );
              const assignedSamples = samples.filter(
                (sample) =>
                  String(sample.analyser?._id || sample.analyser) ===
                    String(a._id) &&
                  ["PROCESSING", "RECEIVED"].includes(sample.specimenStatus),
              );
              const selected = selectedOrders[a._id] || [];
              const isOnline = a.connectionState === "ONLINE";
              const isQcPass = a.qcStatus === "PASS" && !a.qcExpired;

              return (
                <div
                  key={a._id}
                  className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-primary/40 transition-all"
                >
                  <div>
                    {/* Header: Name, Discipline, State */}
                    <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Cpu className="size-4 text-primary" />
                          <h3 className="font-mono text-base font-bold text-foreground">
                            {a.name}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {a.discipline} · ID: {a._id.slice(-6).toUpperCase()}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isOnline
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : a.connectionState === "MAINTENANCE"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            isOnline
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-muted-foreground"
                          }`}
                        />
                        <span>{a.connectionState || "OFFLINE"}</span>
                      </span>
                    </div>

                    {/* Operational Telemetry Metrics */}
                    <div className="grid grid-cols-2 gap-2 my-4 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
                        <span className="text-[10px] text-muted-foreground uppercase block">
                          Current Queue
                        </span>
                        <span className="text-base font-bold text-foreground">
                          {assignedSamples.length}
                        </span>{" "}
                        <span className="text-[10px] text-muted-foreground">
                          specimens
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
                        <span className="text-[10px] text-muted-foreground uppercase block">
                          24H QC Status
                        </span>
                        <span
                          className={`text-sm font-bold flex items-center gap-1 ${
                            isQcPass ? "text-emerald-600" : "text-destructive"
                          }`}
                        >
                          {isQcPass ? (
                            <>
                              <CheckCircle2 className="size-3.5" /> PASS
                            </>
                          ) : (
                            <>
                              <AlertCircle className="size-3.5" />{" "}
                              {a.qcExpired ? "DUE" : a.qcStatus || "FAIL"}
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Controls: Online/Offline toggle, Token rotate */}
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() =>
                          updateLabAnalyserApi(a._id, {
                            connectionState: isOnline ? "OFFLINE" : "ONLINE",
                          })
                            .then(() => loadData(true))
                            .catch(() =>
                              toast.error("Unable to update instrument state"),
                            )
                        }
                        className="flex-1 py-1.5 px-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
                      >
                        {isOnline ? "Set Offline" : "Set Online"}
                      </button>

                      <button
                        type="button"
                        onClick={() => rotateToken(a._id)}
                        className="py-1.5 px-3 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        Rotate Secret Token
                      </button>
                    </div>

                    {/* Quality Control Run Block */}
                    <div className="p-3 rounded-xl border border-border/70 bg-card/60 space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          Record QC Run
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          Last pass:{" "}
                          {a.qcLastPassedAt
                            ? new Date(a.qcLastPassedAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "Never"}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <input
                          value={controlLots[a._id] || ""}
                          onChange={(e) =>
                            setControlLots((p) => ({
                              ...p,
                              [a._id]: e.target.value,
                            }))
                          }
                          placeholder="Control Lot # (e.g. LOT-492)"
                          className="flex-1 bg-background border border-border/80 rounded-md px-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          disabled={busyId === a._id}
                          onClick={() => recordQC(a._id, true)}
                          className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-50"
                        >
                          Pass
                        </button>
                        <button
                          type="button"
                          disabled={busyId === a._id}
                          onClick={() => recordQC(a._id, false)}
                          className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-50"
                        >
                          Fail
                        </button>
                      </div>
                    </div>

                    {/* Specimen Batch Assignment */}
                    <div className="p-3 rounded-xl border border-border/70 bg-card/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          Assign Received Samples
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {receivedSamples.length} available
                        </span>
                      </div>

                      {receivedSamples.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">
                          No specimens waiting for bench assignment.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {receivedSamples.map((sample) => (
                            <label
                              key={sample._id}
                              className="flex items-start gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={selected.includes(sample._id)}
                                onChange={(e) =>
                                  setSelectedOrders((p) => ({
                                    ...p,
                                    [a._id]: e.target.checked
                                      ? [...selected, sample._id]
                                      : selected.filter(
                                          (id) => id !== sample._id,
                                        ),
                                  }))
                                }
                                className="mt-0.5 rounded"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate">
                                  {sample.patient?.name}
                                </p>
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  {sample.testName} · {sample.specimenBarcode}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={busyId === a._id || selected.length === 0}
                        onClick={() => assignWorklist(a._id)}
                        className="w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Assign {selected.length} Specimen
                        {selected.length === 1 ? "" : "s"} to Worklist
                      </button>
                    </div>
                  </div>

                  {/* Assigned Samples Active Worklist */}
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <p className="text-[11px] uppercase font-mono font-semibold text-muted-foreground mb-2">
                      Bench Worklist ({assignedSamples.length})
                    </p>
                    {assignedSamples.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Carousel is clear. Ready for next load.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                        {assignedSamples.map((sample) => (
                          <li
                            key={sample._id}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/60 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground truncate block">
                                {sample.patient?.name || "Patient"}
                              </span>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {sample.specimenBarcode} · {sample.testName}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setManualOrder(sample);
                                setManualBarcode(sample.specimenBarcode || "");
                                setManualResults([
                                  { analyteCode: "", value: "" },
                                ]);
                              }}
                              className="px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-semibold transition-colors shrink-0 cursor-pointer"
                            >
                              Enter Result
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Result Entry Modal / Drawer */}
      <AnimatePresence>
        {manualOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-xl p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                <div>
                  <h3 className="font-mono text-lg font-bold text-foreground">
                    Manual Result Entry
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Order:{" "}
                    <strong className="text-foreground">
                      {manualOrder.testName}
                    </strong>{" "}
                    · Patient: {manualOrder.patient?.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setManualOrder(null)}
                  className="size-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={submitManual} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Confirm Specimen Barcode
                  </label>
                  <input
                    required
                    value={manualBarcode}
                    onChange={(e) =>
                      setManualBarcode(e.target.value.toUpperCase())
                    }
                    placeholder="Scan tube barcode"
                    className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/25"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Expected:{" "}
                    <span className="font-mono">
                      {manualOrder.specimenBarcode}
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground block">
                    Analyte Values &amp; Clinical Parameters
                  </label>

                  {manualResults.map((row, index) => {
                    const matchedAnalyte = analytes.find(
                      (a) => a.code === row.analyteCode,
                    );
                    const numVal = Number(row.value);
                    const isOutOfRange =
                      matchedAnalyte &&
                      row.value !== "" &&
                      ((matchedAnalyte.referenceLow !== undefined &&
                        numVal < matchedAnalyte.referenceLow) ||
                        (matchedAnalyte.referenceHigh !== undefined &&
                          numVal > matchedAnalyte.referenceHigh));

                    return (
                      <div
                        key={index}
                        className="space-y-1 p-2 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            required
                            value={row.analyteCode}
                            onChange={(e) =>
                              setManualResults((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, analyteCode: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            className="bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                          >
                            <option value="">Select Analyte...</option>
                            {analytes
                              .filter((item) => item.active !== false)
                              .map((item) => (
                                <option key={item.code} value={item.code}>
                                  {item.name} ({item.code}) · {item.unit}
                                </option>
                              ))}
                          </select>

                          <div className="relative">
                            <input
                              required
                              type="number"
                              step="any"
                              value={row.value}
                              onChange={(e) =>
                                setManualResults((prev) =>
                                  prev.map((item, i) =>
                                    i === index
                                      ? { ...item, value: e.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="Numeric value"
                              className={`w-full bg-background border rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none ${
                                isOutOfRange
                                  ? "border-amber-500 ring-1 ring-amber-500/20"
                                  : "border-border/80 focus:ring-2 focus:ring-primary/25"
                              }`}
                            />
                            {matchedAnalyte?.unit && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                                {matchedAnalyte.unit}
                              </span>
                            )}
                          </div>
                        </div>

                        {matchedAnalyte && (
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 pt-0.5">
                            <span>
                              Ref: {matchedAnalyte.referenceLow ?? "?"} –{" "}
                              {matchedAnalyte.referenceHigh ?? "?"}{" "}
                              {matchedAnalyte.unit}
                            </span>
                            {isOutOfRange && (
                              <span className="text-amber-600 font-semibold">
                                Out of normal range
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setManualResults((prev) => [
                        ...prev,
                        { analyteCode: "", value: "" },
                      ])
                    }
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    + Add Another Analyte
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setManualOrder(null)}
                      className="px-4 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-colors"
                    >
                      Save Results for Validation
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
