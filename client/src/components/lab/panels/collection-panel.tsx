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
  TestTube,
  Barcode,
  Send,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import {
  fetchLabCollectionsApi,
  markLabCollectedApi,
  uploadLabReportApi,
  createLabBillApi,
  recordLabCashPaymentApi,
  fetchLabHistoryApi,
} from "@/lib/api/lab";
import { toast } from "sonner";
import { openProtectedReport } from "@/lib/api/reports";
import { getSocket } from "@/lib/socket";

// Deterministic barcode pattern (prevents React hydration mismatch)
const BARCODE_STRIPES = [
  3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 2, 3, 2, 1, 4, 1, 3, 2, 1, 2, 4, 1, 3, 1,
  2, 3, 2, 1, 4, 2,
];

function RackGlyph({ tubes }: { tubes: { colour: string; count: number }[] }) {
  const flat = tubes
    .flatMap((t) => Array.from({ length: t.count }, () => t.colour))
    .slice(0, 8);
  return (
    <svg viewBox="0 0 120 48" className="h-10 w-32" aria-hidden="true">
      <line
        x1="4"
        y1="42"
        x2="116"
        y2="42"
        stroke="currentColor"
        className="text-border"
        strokeWidth="1.5"
      />
      {flat.map((c, i) => (
        <g key={i}>
          <rect
            x={8 + i * 13}
            y="8"
            width="8"
            height="32"
            rx="2"
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth="1.5"
          />
          <motion.rect
            x={8 + i * 13}
            width="8"
            rx="2"
            fill={c}
            opacity="0.85"
            initial={{ y: 40, height: 0 }}
            animate={{ y: 22, height: 18 }}
            transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
          />
        </g>
      ))}
    </svg>
  );
}

export function CollectionPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [tab, setTab] = useState<"COLLECTION" | "UPLOAD" | "HISTORY">(
    "COLLECTION",
  );
  const [priorityFilter, setPriorityFilter] = useState<
    "ALL" | "STAT" | "ROUTINE"
  >("ALL");
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // History State
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState("");
  const [historyData, setHistoryData] = useState<{
    reports: any[];
    pagination: any;
  }>({ reports: [], pagination: { pages: 1 } });
  const [historyLoading, setHistoryLoading] = useState(false);

  // POS State
  const [price, setPrice] = useState<string>("500");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "ONLINE" | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "IDLE" | "WAITING" | "PAID"
  >("IDLE");
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [specimenBarcode, setSpecimenBarcode] = useState("");

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadCollections = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetchLabCollectionsApi();
      if (res.success) {
        setRows(res.collections || []);
      }
    } catch {
      toast.error("Failed to load collections");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCollections();
    const socket = getSocket();
    if (socket) {
      const reload = () => loadCollections(true);
      socket.on("lab_collection_updated", reload);
      socket.on("order_created", reload);

      const onInvoicePaid = (event: { invoiceId?: string }) => {
        if (event.invoiceId && event.invoiceId === activeInvoiceId) {
          toast.success(
            "Invoice payment confirmed. You can now collect the sample.",
          );
          setPaymentStatus("PAID");
        }
      };
      socket.on("invoice_paid", onInvoicePaid);

      return () => {
        socket.off("lab_collection_updated", reload);
        socket.off("order_created", reload);
        socket.off("invoice_paid", onInvoicePaid);
      };
    }
  }, [activeInvoiceId]);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetchLabHistoryApi(historyPage, 10, historySearch);
      if (res.success) {
        setHistoryData({
          reports: res.reports || [],
          pagination: res.pagination || { pages: 1 },
        });
      }
    } catch {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "HISTORY") {
      const timer = setTimeout(() => {
        loadHistory();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [tab, historyPage, historySearch]);

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
    setPaymentMode(null);
    setIsPaid(order.status === "IN_PROGRESS");
    const invoice =
      order.invoice && typeof order.invoice === "object" ? order.invoice : null;
    setPaymentStatus(
      invoice?.status === "PAID" ? "PAID" : invoice ? "WAITING" : "IDLE",
    );
    setActiveInvoiceId(invoice?._id || null);
    setPrice(String(invoice?.totalAmount ?? 500));
    setSpecimenBarcode("");

    // Auto-focus barcode input after transition
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 150);
  };

  const handleSendBill = async () => {
    if (!selectedOrder) return;
    try {
      setPaymentStatus("WAITING");
      toast.info("Sending bill to patient portal...");
      const result = await createLabBillApi(selectedOrder._id, Number(price));
      setActiveInvoiceId(result.invoice?._id || null);
      if (result.invoice?.totalAmount !== undefined)
        setPrice(String(result.invoice.totalAmount));
      if (result.invoice?.status === "PAID") {
        setPaymentStatus("PAID");
        toast.success("This diagnostic invoice is already paid.");
      } else {
        setPaymentStatus("WAITING");
        toast.success(
          "Bill sent! Waiting for patient to pay via HealOS app...",
        );
      }
    } catch {
      toast.error("Failed to send bill.");
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
      if (!activeInvoiceId) throw new Error("Create a patient invoice first.");
      if (
        !specimenBarcode.trim() ||
        specimenBarcode.trim().toUpperCase() !== selectedOrder.specimenBarcode
      ) {
        throw new Error("Scan or confirm the active specimen barcode.");
      }
      if (paymentMode === "ONLINE" && paymentStatus !== "PAID")
        throw new Error("Wait for the patient invoice to show as paid.");
      if (paymentMode === "CASH" && paymentStatus !== "PAID")
        await recordLabCashPaymentApi(selectedOrder._id);
      await markLabCollectedApi(selectedOrder._id, specimenBarcode.trim());
      toast.success("Payment verified and sample collected successfully.");
      setIsPaid(true);

      await loadCollections(true);
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

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const validTypes: Record<string, string[]> = {
      ".pdf": ["application/pdf"],
      ".jpg": ["image/jpeg"],
      ".jpeg": ["image/jpeg"],
      ".png": ["image/png"],
    };
    if (!validTypes[ext]?.includes(file.type)) {
      toast.error("Upload a PDF, JPG, or PNG report.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading((prev) => ({ ...prev, [id]: true }));
      toast.info("Uploading diagnostic report...");
      const res = await uploadLabReportApi(id, formData);
      if (res.status === "success" || res.success) {
        toast.success("Report uploaded! Sent to Validation queue.");
        setSelectedOrder(null);
        loadCollections(true);
      }
    } catch {
      toast.error("Failed to upload result");
    } finally {
      setIsUploading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleFillBarcode = () => {
    if (selectedOrder?.specimenBarcode) {
      setSpecimenBarcode(selectedOrder.specimenBarcode);
      toast.success("Barcode filled from requisition.");
    }
  };

  // Count badges
  const awaitingCount = useMemo(
    () => rows.filter((r) => r.status === "PENDING").length,
    [rows],
  );
  const pendingUploadCount = useMemo(
    () => rows.filter((r) => r.status === "IN_PROGRESS").length,
    [rows],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const visibleOrders = rows.filter((order) => {
    const matchesStatus =
      tab === "COLLECTION"
        ? order.status === "PENDING"
        : order.status === "IN_PROGRESS";

    const matchesPriority =
      priorityFilter === "ALL"
        ? true
        : priorityFilter === "STAT"
          ? ["STAT", "URGENT", "EMERGENCY"].includes(
              order.priority?.toUpperCase(),
            )
          : !["STAT", "URGENT", "EMERGENCY"].includes(
              order.priority?.toUpperCase(),
            );

    const searchableText =
      `${order.patient?.name || order.emergencyCase?.patientName || ""} ${order.emergencyCase?.caseId || ""} ${order.patient?.mrn || ""} ${order.accessionNumber || ""} ${order.testName || ""} ${order.specimenBarcode || ""} ${order._id || ""}`.toLowerCase();
    return (
      matchesStatus &&
      matchesPriority &&
      searchableText.includes(normalizedSearch)
    );
  });

  const barcodeMatches =
    Boolean(specimenBarcode.trim()) &&
    specimenBarcode.trim().toUpperCase() === selectedOrder?.specimenBarcode;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground p-6">
        <Loader2 className="size-8 animate-spin mb-3 text-primary" />
        <p className="font-mono text-sm tracking-wide">
          Syncing phlebotomy queue...
        </p>
      </div>
    );
  }

  return (
    <section className="min-h-[calc(100vh-4rem)] flex flex-col">
      <PanelHeader
        index="01 / phlebotomy"
        title="Sample Collection & POS"
        note="Order verification, phlebotomy barcode scanning, point-of-sale invoice creation, and report uploading."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadCollections(true)}
              disabled={isRefreshing}
              aria-label="Refresh collection queue"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 hover:bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <div className="flex bg-muted/60 p-1 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => {
                  setTab("COLLECTION");
                  setSelectedOrder(null);
                }}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all inline-flex items-center gap-1.5 ${
                  tab === "COLLECTION"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TestTube className="size-3.5" />
                <span>Collection</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                  {awaitingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab("UPLOAD");
                  setSelectedOrder(null);
                }}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all inline-flex items-center gap-1.5 ${
                  tab === "UPLOAD"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UploadCloud className="size-3.5" />
                <span>Pending Upload</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted-foreground/15 text-muted-foreground font-bold">
                  {pendingUploadCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab("HISTORY");
                  setSelectedOrder(null);
                }}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all inline-flex items-center gap-1.5 ${
                  tab === "HISTORY"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="size-3.5" />
                <span>History Archive</span>
              </button>
            </div>
          </div>
        }
      />

      <div className="flex-1 flex flex-col lg:flex-row bg-background border-t border-border/60 min-h-0">
        {tab === "HISTORY" ? (
          <div className="flex-1 flex flex-col bg-background min-h-[65vh]">
            <div className="p-4 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
              <div>
                <h2 className="font-mono text-lg font-bold">
                  Diagnostic Reports Archive
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Finalized patient diagnostic reports and verified releases.
                </p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="diagnostic-history-search"
                  aria-label="Search diagnostic reports archive"
                  placeholder="Search test name, accession, patient..."
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full bg-background border border-border/70 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {historyLoading ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : historyData.reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
                  <ShieldCheck className="size-12 mb-3 opacity-30 text-primary" />
                  <p className="font-medium text-foreground">
                    No historical reports found
                  </p>
                  <p className="text-xs mt-1">
                    Validated reports will automatically archive here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {historyData.reports.map((report: any) => (
                    <div
                      key={report._id}
                      className="bg-card border border-border/70 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                          <CheckCircle2 className="size-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">
                              {report.patient?.name || "Unknown Patient"}
                            </span>
                            <span className="text-muted-foreground text-xs font-mono">
                              MRN: {report.patient?.mrn || "N/A"}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">
                              {report.order?.accessionNumber ||
                                report._id.slice(-8)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                            <span className="font-medium text-foreground/80">
                              {report.title ||
                                report.order?.testName ||
                                "Diagnostic Report"}
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(report.createdAt).toLocaleDateString(
                                [],
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openProtectedReport(report._id).catch(() =>
                            toast.error("Unable to open this report"),
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg transition-colors cursor-pointer self-start sm:self-center"
                      >
                        <Eye className="size-3.5" />
                        <span>View Report PDF</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {historyData.pagination?.pages > 1 && (
              <div className="p-4 border-t border-border/50 bg-muted/10 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Page {historyPage} of {historyData.pagination.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    className="p-2 border border-border/70 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={historyPage === historyData.pagination.pages}
                    onClick={() => setHistoryPage((p) => p + 1)}
                    className="p-2 border border-border/70 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Left Pane: Queue List */}
            <div
              className={`w-full lg:w-[40%] xl:w-[35%] flex flex-col border-r border-border/60 bg-muted/5 ${
                selectedOrder ? "hidden lg:flex" : "flex"
              }`}
            >
              {/* Queue Controls */}
              <div className="p-4 sm:p-5 border-b border-border/50 space-y-3 bg-card/40">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="collection-queue-search"
                    aria-label="Search patient, accession, or test"
                    placeholder="Search MRN, accession, patient..."
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

                {/* Priority quick filter chips */}
                <div className="flex items-center gap-1.5 text-xs">
                  <Filter className="size-3 text-muted-foreground mr-1" />
                  <button
                    type="button"
                    onClick={() => setPriorityFilter("ALL")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      priorityFilter === "ALL"
                        ? "bg-foreground text-background font-semibold"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All ({visibleOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriorityFilter("STAT")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      priorityFilter === "STAT"
                        ? "bg-rose-500 text-white font-semibold"
                        : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                    }`}
                  >
                    STAT / Urgent
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriorityFilter("ROUTINE")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      priorityFilter === "ROUTINE"
                        ? "bg-foreground text-background font-semibold"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Routine
                  </button>
                </div>
              </div>

              {/* Queue Items */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
                {visibleOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    <TestTube className="size-10 mb-2 opacity-30 text-primary" />
                    <p className="font-medium text-foreground text-sm">
                      {tab === "COLLECTION"
                        ? "No orders awaiting collection"
                        : "No orders pending report upload"}
                    </p>
                    <p className="text-xs mt-1 max-w-xs">
                      {search
                        ? "Try clearing your search query."
                        : "New laboratory orders will show up here automatically via live socket sync."}
                    </p>
                  </div>
                ) : (
                  visibleOrders.map((order) => {
                    const isSelected = selectedOrder?._id === order._id;
                    const patientName =
                      order.patient?.name ||
                      order.emergencyCase?.patientName ||
                      "Unknown Patient";
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
                              {order.patient?.mrn && (
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                    isSelected
                                      ? "bg-primary-foreground/20 text-primary-foreground"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {order.patient.mrn}
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
                              <span>
                                {order.specimenBarcode || "No barcode"}
                              </span>
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
                                ? "Collected"
                                : order.priority || "Routine"}
                            </span>
                            <span
                              className={`text-[10px] ${
                                isSelected
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {new Date(order.createdAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Pane: Checkout & Details */}
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
                      <span>Back to Queue</span>
                    </button>
                    <span className="text-xs font-mono text-muted-foreground">
                      {selectedOrder.accessionNumber ||
                        selectedOrder._id.slice(-8)}
                    </span>
                  </div>

                  {/* Header & Order Summary */}
                  <div className="p-4 sm:p-6 lg:p-8 border-b border-border/50 bg-card/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <TestTube className="size-5" />
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
                                  "Unknown Patient"}
                              </strong>{" "}
                              ·{" "}
                              {selectedOrder.emergencyCase
                                ? `ED ${selectedOrder.emergencyCase.caseId}`
                                : `MRN: ${selectedOrder.patient?.mrn || "N/A"}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="size-3.5" /> Sample
                            Collected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="size-3.5" /> Awaiting Specimen
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Specimen and Requisition Meta */}
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
                          Expected Tube & Rack
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <RackGlyph
                            tubes={[
                              {
                                colour: "var(--color-primary, #059669)",
                                count: 1,
                              },
                            ]}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                          Specimen Barcode
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Barcode className="size-4 text-primary" />
                          <span className="font-mono text-sm font-bold">
                            {selectedOrder.specimenBarcode || "Not generated"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Body Content: Either Upload state or Billing/Collection state */}
                  <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
                    {isPaid ? (
                      /* Post-collection state: ready for report upload */
                      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8">
                        {/* Printable Specimen Label Voucher */}
                        <div className="w-full bg-card border-2 border-dashed border-emerald-500/40 rounded-2xl p-6 shadow-sm mb-6">
                          <div className="flex justify-between items-center border-b border-border/50 pb-3 mb-4">
                            <div className="text-left">
                              <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                                HealOS Laboratory Label
                              </p>
                              <p className="font-bold text-sm text-foreground">
                                {selectedOrder.patient?.name ||
                                  selectedOrder.emergencyCase?.patientName ||
                                  "Unknown Patient"}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-600">
                              VERIFIED
                            </span>
                          </div>

                          {/* Deterministic Barcode Visualization */}
                          <div className="flex flex-col items-center justify-center my-3">
                            <div className="flex h-12 w-64 justify-center items-end bg-foreground/5 p-1 rounded">
                              {BARCODE_STRIPES.map((width, i) => (
                                <div
                                  key={i}
                                  className="h-full bg-foreground mx-0.5"
                                  style={{ width: `${width}px` }}
                                />
                              ))}
                            </div>
                            <p className="font-mono text-base font-bold tracking-widest mt-1 text-foreground">
                              {selectedOrder.specimenBarcode}
                            </p>
                          </div>

                          <div className="flex justify-between text-left text-xs text-muted-foreground pt-3 border-t border-border/50 mt-2">
                            <span>Test: {selectedOrder.testName}</span>
                            <span>
                              {selectedOrder.emergencyCase
                                ? `ED ${selectedOrder.emergencyCase.caseId}`
                                : `MRN: ${selectedOrder.patient?.mrn || "N/A"}`}
                            </span>
                          </div>
                        </div>

                        <h3 className="font-mono text-lg font-bold text-foreground mb-1">
                          Specimen Collected & Labeled
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-md mb-6">
                          The sample has moved into laboratory custody. Run
                          analysis on bench instruments or upload the finalized
                          diagnostic PDF report below.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <label
                            htmlFor="diagnostic-pdf-upload"
                            className={`cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all ${
                              isUploading[selectedOrder._id]
                                ? "opacity-60 pointer-events-none"
                                : ""
                            }`}
                          >
                            <input
                              id="diagnostic-pdf-upload"
                              aria-label="Upload finalized diagnostic PDF report"
                              type="file"
                              className="hidden"
                              accept=".pdf,image/*"
                              onChange={(e) =>
                                handleUpload(selectedOrder._id, e)
                              }
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
                                <span>Upload Result PDF</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    ) : (
                      /* Active Collection & POS Workflow */
                      <div className="space-y-6 max-w-2xl">
                        {/* 1. Price Configuration */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-border/70 bg-card/40">
                            <label
                              htmlFor="lab-test-price-input"
                              className="text-xs font-semibold text-foreground flex items-center justify-between mb-2"
                            >
                              <span>Test Price / Fee</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                INR (₹)
                              </span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                                ₹
                              </span>
                              <input
                                id="lab-test-price-input"
                                aria-label="Set price in rupees"
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
                              Payment Method
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

                        {/* 2. Online Billing notice if selected */}
                        {paymentMode === "ONLINE" && (
                          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 space-y-3">
                            <div className="flex items-start gap-3">
                              <CreditCard className="size-5 text-indigo-600 shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-semibold text-sm text-foreground">
                                  Patient App Online Payment
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Generate a real invoice on the patient portal.
                                  Once paid, the collection lock unlocks
                                  automatically.
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
                                    Waiting for patient to complete payment...
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
                                <span>
                                  Online Payment Verified via Socket! Ready to
                                  collect.
                                </span>
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
                              Confirm physical receipt of cash before proceeding
                              with specimen collection.
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

                        {/* 3. Barcode Scanner Verification */}
                        <div className="p-4 rounded-xl border border-border/80 bg-card/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="lab-specimen-barcode"
                              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                            >
                              <Barcode className="size-4 text-primary" />
                              <span>Scan Specimen Tube Barcode</span>
                            </label>
                            {selectedOrder.specimenBarcode && (
                              <button
                                type="button"
                                onClick={handleFillBarcode}
                                className="text-[11px] font-mono text-primary hover:underline cursor-pointer"
                              >
                                Auto-fill ({selectedOrder.specimenBarcode})
                              </button>
                            )}
                          </div>

                          <div className="relative">
                            <input
                              ref={barcodeInputRef}
                              id="lab-specimen-barcode"
                              value={specimenBarcode}
                              onChange={(e) =>
                                setSpecimenBarcode(e.target.value.toUpperCase())
                              }
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  barcodeMatches &&
                                  !isProcessing
                                ) {
                                  e.preventDefault();
                                  void handleCheckout();
                                }
                              }}
                              autoComplete="off"
                              placeholder="Scan or type barcode (e.g. LAB-...)"
                              className={`w-full rounded-lg border bg-background px-3 py-2.5 font-mono text-sm outline-none transition-all ${
                                barcodeMatches
                                  ? "border-emerald-500 ring-2 ring-emerald-500/20"
                                  : specimenBarcode
                                    ? "border-amber-500 ring-2 ring-amber-500/20"
                                    : "border-border/80 focus:ring-2 focus:ring-primary/25"
                              }`}
                            />
                            {barcodeMatches && (
                              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-600" />
                            )}
                          </div>

                          <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                            <span>
                              Expected barcode:{" "}
                              <strong className="font-mono text-foreground">
                                {selectedOrder.specimenBarcode ||
                                  "Not assigned"}
                              </strong>
                            </span>
                            {barcodeMatches && (
                              <span className="text-emerald-600 font-medium">
                                Barcode matched!
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Submit Action Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleCheckout}
                            disabled={
                              isProcessing ||
                              !activeInvoiceId ||
                              !paymentMode ||
                              Number(price) <= 0 ||
                              !barcodeMatches ||
                              (paymentMode === "ONLINE" &&
                                paymentStatus !== "PAID")
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
                                <span>Recording Collection...</span>
                              </>
                            ) : (
                              <>
                                <span>Confirm Payment & Collect Specimen</span>
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
                /* Empty state when no order selected */
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                  <div className="size-20 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                    <TestTube className="size-10 opacity-30 text-primary" />
                  </div>
                  <h3 className="font-mono text-xl font-bold text-foreground">
                    Phlebotomy Bench POS
                  </h3>
                  <p className="text-xs max-w-sm mt-1 leading-relaxed">
                    Select a requisition from the queue to verify tube labels,
                    process patient copay or UPI invoices, and record sample
                    custody.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
