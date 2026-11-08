"use client";

/* Hallmark · macrostructure: Master-Detail / POS Split · genre: modern-minimal
 * states: default, hover, focus, active, loading, error, success
 * contrast: pass · accessibility: compliant
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  X,
  ShieldCheck,
  CreditCard,
  Banknote,
  Smartphone,
  Loader2,
  ArrowRight,
  AlertCircle,
  Search,
  UploadCloud,
  Radiation,
  Send,
  FileText,
  ChevronLeft,
  RefreshCw,
  CheckCircle2,
  Filter,
  Sparkles,
  Layers,
  Clock,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import {
  fetchPendingOrdersApi,
  updateOrderStatusApi,
  createRadiologyBillApi,
  recordRadiologyCashPaymentApi,
  uploadDiagnosticReportApi,
} from "@/lib/api/radiology";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/use-auth-store";

function ScannerGlyph({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 120 72" className="h-14 w-full" aria-hidden="true">
      <rect
        x="8"
        y="12"
        width="104"
        height="48"
        rx="4"
        fill="none"
        stroke="currentColor"
        className="text-border"
        strokeWidth="1.5"
      />
      <circle
        cx="60"
        cy="36"
        r="17"
        fill="none"
        stroke="currentColor"
        className="text-primary/40"
        strokeWidth="1.5"
      />
      <circle
        cx="60"
        cy="36"
        r="8"
        fill="none"
        stroke="currentColor"
        className="text-primary"
        strokeWidth="1.5"
      />
      {active && (
        <motion.line
          x1="12"
          x2="108"
          y1="16"
          y2="16"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="2"
          animate={{ y1: [16, 56, 16], y2: [16, 56, 16] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </svg>
  );
}

export function WorklistPanel() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [modalityFilter, setModalityFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<
    "ALL" | "STAT" | "ROUTINE"
  >("ALL");

  // POS State
  const [price, setPrice] = useState<string>("2500");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "ONLINE" | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "IDLE" | "WAITING" | "PAID"
  >("IDLE");
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetchPendingOrdersApi();
      if (res.status === "success") {
        setOrders(res.data.orders || []);
      }
    } catch {
      toast.error("Failed to load radiology worklist");
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
      socket.on("radiology_order_updated", reload);
      socket.on("order_created", reload);

      const onInvoicePaid = (event: { invoiceId?: string }) => {
        if (event.invoiceId && event.invoiceId === activeInvoiceId) {
          toast.success(
            "Invoice payment confirmed. The imaging scan can now begin.",
          );
          setPaymentStatus("PAID");
        }
      };
      socket.on("invoice_paid", onInvoicePaid);

      return () => {
        socket.off("radiology_order_updated", reload);
        socket.off("order_created", reload);
        socket.off("invoice_paid", onInvoicePaid);
      };
    }
  }, [activeInvoiceId]);

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
    setPaymentMode(null);
    const inProgressOrDone =
      order.status === "IN_PROGRESS" || order.status === "REPORTED";
    setIsPaid(inProgressOrDone);
    const invoice =
      order.invoice && typeof order.invoice === "object" ? order.invoice : null;
    setPaymentStatus(
      invoice?.status === "PAID" ? "PAID" : invoice ? "WAITING" : "IDLE",
    );
    setActiveInvoiceId(invoice?._id || null);
    setPrice(String(invoice?.totalAmount ?? order.price ?? 2500));
  };

  const handleSendBill = async () => {
    if (!selectedOrder) return;
    try {
      setPaymentStatus("WAITING");
      toast.info("Sending diagnostic invoice to patient app...");
      const result = await createRadiologyBillApi(
        selectedOrder._id,
        Number(price),
      );
      setActiveInvoiceId(result.invoice?._id || null);
      setPaymentStatus("WAITING");
      toast.success("Bill dispatched! Waiting for patient mobile payment...");
    } catch {
      toast.error("Failed to create invoice.");
      setPaymentStatus("IDLE");
    }
  };

  const handleCheckout = async () => {
    if (!selectedOrder) return;

    if (!paymentMode) {
      toast.error("Please select a payment mode.");
      return;
    }

    setIsProcessing(true);
    try {
      if (!activeInvoiceId) throw new Error("Generate patient invoice first.");
      if (paymentMode === "ONLINE" && paymentStatus !== "PAID")
        throw new Error("Wait for patient online confirmation.");
      if (paymentMode === "CASH")
        await recordRadiologyCashPaymentApi(selectedOrder._id);

      await updateOrderStatusApi(selectedOrder._id, "IN_PROGRESS");
      toast.success("Payment confirmed! Study marked IN_PROGRESS.");
      setIsPaid(true);
      await loadData(true);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to complete checkout.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async (
    id: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("reportFile", file);
    formData.append("comments", "Uploaded from radiology POS console");

    try {
      setIsUploading((prev) => ({ ...prev, [id]: true }));
      toast.info("Uploading imaging report...");
      const res = await uploadDiagnosticReportApi(id, formData);
      if (res.status === "success") {
        toast.success("Diagnostic report uploaded and study released!");
        setSelectedOrder(null);
        await loadData(true);
      }
    } catch {
      toast.error("Failed to upload report");
    } finally {
      setIsUploading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Filter out reported orders from worklist
  const pendingQueue = useMemo(
    () => orders.filter((o) => o.status !== "REPORTED"),
    [orders],
  );

  const modalitiesList = useMemo(() => {
    const set = new Set<string>();
    pendingQueue.forEach((o) => {
      if (o.modality) set.add(o.modality);
    });
    return Array.from(set);
  }, [pendingQueue]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pendingQueue.filter((order) => {
      const patientName = order.patient
        ? `${order.patient.firstName || ""} ${order.patient.lastName || ""}`.trim() ||
          order.patient.name ||
          ""
        : order.emergencyCase?.patientName || "";

      // Modality filter
      if (modalityFilter !== "ALL" && order.modality !== modalityFilter)
        return false;

      // Priority filter
      const isStat = ["STAT", "URGENT", "EMERGENCY"].includes(
        order.priority?.toUpperCase(),
      );
      if (priorityFilter === "STAT" && !isStat) return false;
      if (priorityFilter === "ROUTINE" && isStat) return false;

      if (!q) return true;
      const searchable =
        `${patientName} ${order.emergencyCase?.caseId || ""} ${order.accessionNumber || ""} ${order.testName || ""} ${order.modality || ""} ${order._id || ""}`.toLowerCase();
      return searchable.includes(q);
    });
  }, [pendingQueue, search, modalityFilter, priorityFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground p-6">
        <Loader2 className="size-8 animate-spin mb-3 text-primary" />
        <p className="font-mono text-sm tracking-wide">
          Connecting to PACS worklist...
        </p>
      </div>
    );
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] flex flex-col">
      <PanelHeader
        index="01 / modality worklist"
        title="Modality Worklist & POS Console"
        note={`Duty Radiologist: Dr. ${user?.name || "Specialist"} · PACS Store: Online · Real-time RIS/PACS synchronization`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              aria-label="Refresh worklist"
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

      <div className="flex-1 flex flex-col lg:flex-row bg-background border-t border-border/60 min-h-0">
        {/* Left Pane: Study Worklist Queue */}
        <div
          className={`w-full lg:w-[40%] xl:w-[35%] flex flex-col border-r border-border/60 bg-muted/5 ${
            selectedOrder ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Search and Filters */}
          <div className="p-4 sm:p-5 border-b border-border/50 space-y-3 bg-card/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="radiology-worklist-search"
                aria-label="Search patient name, accession, or scan"
                placeholder="Search MRN, accession #, study..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-background border border-border/70 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
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

            {/* Modality Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs custom-scrollbar">
              <button
                type="button"
                onClick={() => setModalityFilter("ALL")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-all ${
                  modalityFilter === "ALL"
                    ? "bg-foreground text-background font-semibold"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                All Modalities ({pendingQueue.length})
              </button>
              {modalitiesList.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModalityFilter(m)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-all ${
                    modalityFilter === m
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5 text-xs pt-1 border-t border-border/40">
              <span className="text-[10px] uppercase font-mono text-muted-foreground mr-1">
                Priority:
              </span>
              <button
                type="button"
                onClick={() => setPriorityFilter("ALL")}
                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  priorityFilter === "ALL"
                    ? "bg-foreground text-background font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter("STAT")}
                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  priorityFilter === "STAT"
                    ? "bg-rose-500 text-white font-bold"
                    : "text-rose-600 bg-rose-500/10 hover:bg-rose-500/20"
                }`}
              >
                STAT / Urgent
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter("ROUTINE")}
                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  priorityFilter === "ROUTINE"
                    ? "bg-foreground text-background font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Routine
              </button>
            </div>
          </div>

          {/* Studies List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <Radiation className="size-10 mb-2 opacity-30 text-primary" />
                <p className="font-medium text-foreground text-sm">
                  Worklist is clear
                </p>
                <p className="text-xs mt-1 max-w-xs">
                  {search
                    ? "No studies match your search."
                    : "New physician radiology requisitions will stream here in real time."}
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedOrder?._id === order._id;
                const patientName = order.patient
                  ? `${order.patient.firstName || ""} ${order.patient.lastName || ""}`.trim() ||
                    order.patient.name ||
                    "Unknown Patient"
                  : order.emergencyCase?.patientName || "Unknown Patient";
                const isStat = ["STAT", "URGENT", "EMERGENCY"].includes(
                  order.priority?.toUpperCase(),
                );

                return (
                  <button
                    key={order._id}
                    type="button"
                    onClick={() => handleSelectOrder(order)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md border-primary ring-2 ring-primary/20 scale-[1.01]"
                        : "bg-card hover:bg-muted/50 border-border/70 hover:border-primary/40 shadow-xs"
                    }`}
                  >
                    {isStat && !isSelected && (
                      <div className="absolute top-0 right-0 w-2 h-full bg-rose-500" />
                    )}

                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-semibold text-sm truncate ${
                              isSelected
                                ? "text-primary-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {patientName}
                          </p>
                          {order.modality && (
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                                isSelected
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {order.modality}
                            </span>
                          )}
                        </div>

                        <p
                          className={`text-xs mt-1 font-medium truncate ${
                            isSelected
                              ? "text-primary-foreground/90"
                              : "text-foreground/90"
                          }`}
                        >
                          {order.testName}
                        </p>

                        <div
                          className={`flex items-center gap-2 mt-2 text-[10px] font-mono ${
                            isSelected
                              ? "text-primary-foreground/75"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span className="uppercase tracking-wider">
                            {order.accessionNumber || order._id.slice(-8)}
                          </span>
                          <span>•</span>
                          <span>{order.room || "Scanner Room"}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            order.status === "IN_PROGRESS"
                              ? isSelected
                                ? "bg-primary-foreground/25 text-primary-foreground"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : isStat
                                ? isSelected
                                  ? "bg-rose-950 text-rose-200"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                : isSelected
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {order.status === "IN_PROGRESS"
                            ? "In Scan"
                            : order.priority || "Routine"}
                        </span>
                        <span
                          className={`text-[10px] ${
                            isSelected
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Study Procedure & POS Checkout */}
        <div
          className={`w-full lg:w-[60%] xl:w-[65%] flex flex-col bg-background overflow-hidden ${
            !selectedOrder ? "hidden lg:flex" : "flex"
          }`}
        >
          {selectedOrder ? (
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Mobile Back Button */}
              <div className="lg:hidden p-3 border-b border-border/60 bg-muted/30 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 py-1 px-2 rounded-md hover:bg-primary/10 transition-colors"
                >
                  <ChevronLeft className="size-4" />
                  <span>Back to Worklist</span>
                </button>
                <span className="text-xs font-mono text-muted-foreground">
                  {selectedOrder.accessionNumber || selectedOrder._id.slice(-8)}
                </span>
              </div>

              {/* Study Header & Details */}
              <div className="p-4 sm:p-6 lg:p-8 border-b border-border/50 bg-card/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Radiation className="size-5" />
                      </div>
                      <div>
                        <h2 className="font-mono text-xl font-bold">
                          {selectedOrder.testName}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Patient:{" "}
                          <strong className="text-foreground">
                            {selectedOrder.patient?.name ||
                              selectedOrder.emergencyCase?.patientName ||
                              `${selectedOrder.patient?.firstName || ""} ${selectedOrder.patient?.lastName || ""}`}
                          </strong>{" "}
                          {selectedOrder.emergencyCase && (
                            <span>
                              · ED {selectedOrder.emergencyCase.caseId}{" "}
                            </span>
                          )}
                          · Modality:{" "}
                          <span className="font-mono font-bold text-foreground">
                            {selectedOrder.modality || "Imaging"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="size-3.5" /> Scan Initiated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="size-3.5" /> Awaiting Clearance
                      </span>
                    )}
                  </div>
                </div>

                {/* Procedure Room & PACS Telemetry */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-border/70 bg-card/60">
                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                      Accession Number
                    </p>
                    <p className="font-mono text-sm font-semibold mt-0.5">
                      {selectedOrder.accessionNumber ||
                        selectedOrder._id.slice(-8)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                      Assigned Room
                    </p>
                    <p className="font-mono text-sm font-semibold mt-0.5">
                      {selectedOrder.room || "Main Imaging Bay 1"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                      Modality Scanner
                    </p>
                    <div className="mt-1">
                      <ScannerGlyph active={isPaid} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Procedure State & Payment Workflow */}
              <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
                {isPaid ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8">
                    <div className="size-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-4">
                      <CheckCircle2 className="size-8" />
                    </div>
                    <h3 className="font-mono text-lg font-bold text-foreground">
                      Scan In Progress
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md mt-1 mb-6">
                      The patient has been cleared and the imaging procedure is
                      active. Once image series are acquired, upload the
                      diagnostic PDF report or sign off in the Reporting Desk.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <label
                        htmlFor="radiology-report-upload-inline"
                        className={`cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-all ${
                          isUploading[selectedOrder._id]
                            ? "opacity-60 pointer-events-none"
                            : ""
                        }`}
                      >
                        <input
                          id="radiology-report-upload-inline"
                          aria-label="Upload radiology report document"
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.dcm,.zip"
                          onChange={(e) => handleUpload(selectedOrder._id, e)}
                          disabled={isUploading[selectedOrder._id]}
                        />
                        {isUploading[selectedOrder._id] ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Uploading Report...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="size-4" />
                            <span>Upload Report PDF</span>
                          </>
                        )}
                      </label>

                      <button
                        type="button"
                        onClick={() => setSelectedOrder(null)}
                        className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        Next Patient Study
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 max-w-2xl">
                    {/* Fee Setting & Payment Mode Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-border/70 bg-card/40">
                        <label
                          htmlFor="radiology-order-price"
                          className="text-xs font-semibold text-foreground flex items-center justify-between mb-2"
                        >
                          <span>Scan Fee</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            INR (₹)
                          </span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                            ₹
                          </span>
                          <input
                            id="radiology-order-price"
                            aria-label="Set scan fee in rupees"
                            type="number"
                            min="0"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full bg-background border border-border/80 rounded-lg pl-7 pr-3 py-2 text-base font-mono font-bold outline-none focus:ring-2 focus:ring-primary/25"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-border/70 bg-card/40">
                        <p className="text-xs font-semibold text-foreground mb-2">
                          Payment Mode
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMode("CASH")}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                              paymentMode === "CASH"
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "bg-background text-muted-foreground border-border/70 hover:bg-muted/50"
                            }`}
                          >
                            <Banknote className="size-4" />
                            <span>Cash</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentMode("ONLINE")}
                            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                              paymentMode === "ONLINE"
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                : "bg-background text-muted-foreground border-border/70 hover:bg-muted/50"
                            }`}
                          >
                            <Smartphone className="size-4" />
                            <span>Online UPI</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Online Billing Card */}
                    {paymentMode === "ONLINE" && (
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 space-y-3">
                        <div className="flex items-start gap-3">
                          <CreditCard className="size-5 text-indigo-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-sm text-foreground">
                              Patient Mobile Payment
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Push an invoice to the patient billing dashboard.
                              The scan unlocks automatically when paid.
                            </p>
                          </div>
                        </div>

                        {!activeInvoiceId && (
                          <button
                            type="button"
                            onClick={handleSendBill}
                            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            <Send className="size-3.5" /> Send Invoice to
                            Patient Portal (₹{price})
                          </button>
                        )}

                        {paymentStatus === "WAITING" && (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-background/80 border border-indigo-500/20 text-xs">
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                              <Loader2 className="size-4 animate-spin" />
                              <span>
                                Awaiting patient payment via HealOS app...
                              </span>
                            </div>
                            <span className="font-mono font-bold">
                              ₹{price}
                            </span>
                          </div>
                        )}

                        {paymentStatus === "PAID" && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                            <CheckCircle2 className="size-4" />
                            <span>Payment Verified! Ready to start scan.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {paymentMode === "CASH" && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">
                            Cash Settlement
                          </span>
                          <span className="font-mono text-sm font-bold text-emerald-600">
                            ₹{price}.00
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Collect cash physically at reception/billing counter
                          before initiating procedure.
                        </p>
                        {!activeInvoiceId && (
                          <button
                            type="button"
                            onClick={handleSendBill}
                            className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 underline underline-offset-2 hover:opacity-80"
                          >
                            Create invoice record first
                          </button>
                        )}
                      </div>
                    )}

                    {/* Checkout Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleCheckout}
                        disabled={
                          isProcessing ||
                          !activeInvoiceId ||
                          !paymentMode ||
                          Number(price) <= 0 ||
                          (paymentMode === "ONLINE" && paymentStatus !== "PAID")
                        }
                        className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          paymentMode === "ONLINE"
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground"
                        }`}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Processing Study Clearance...</span>
                          </>
                        ) : (
                          <>
                            <span>Confirm Payment &amp; Start Scan</span>
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
              <div className="size-20 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                <Radiation className="size-10 opacity-30 text-primary" />
              </div>
              <h3 className="font-mono text-xl font-bold text-foreground">
                Radiology Examination POS
              </h3>
              <p className="text-xs max-w-sm mt-1 leading-relaxed">
                Select a patient study from the worklist on the left to verify
                requisition details, collect fees, and launch the scanner
                procedure.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
