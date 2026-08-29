"use client";

/* Hallmark · macrostructure: Master-Detail / POS Split · genre: modern-minimal
 * states: hover, focus, loading, error, success
 * contrast: pass
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, ShieldCheck, CreditCard, Banknote, QrCode, Smartphone, Loader2, ArrowRight, AlertCircle, Search, UploadCloud, TestTube, Barcode, Send } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { fetchLabCollectionsApi, markLabCollectedApi, uploadLabReportApi, createLabBillApi, fetchLabHistoryApi } from "@/lib/api/lab";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

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

export function CollectionPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [tab, setTab] = useState<"COLLECTION" | "UPLOAD" | "HISTORY">("COLLECTION");
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  
  // History State
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState("");
  const [historyData, setHistoryData] = useState<{reports: any[], pagination: any}>({ reports: [], pagination: { pages: 1 } });
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // POS State
  const [price, setPrice] = useState<string>("500");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "ONLINE" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"IDLE" | "WAITING" | "PAID">("IDLE");

  const loadCollections = async () => {
    try {
      const res = await fetchLabCollectionsApi();
      if (res.success) {
        setRows(res.collections);
      }
    } catch (e) {
      toast.error("Failed to load collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
    const socket = getSocket();
    if (socket) {
      const reload = () => loadCollections();
      socket.on("lab_collection_updated", reload);
      socket.on("order_created", reload);
      
      const onInvoicePaid = () => {
        setPaymentStatus(prev => {
          if (prev === "WAITING") {
             toast.success("Online payment verified by backend!");
             return "PAID";
          }
          return prev;
        });
      };
      socket.on("invoice_paid", onInvoicePaid);
      
      return () => {
        socket.off("lab_collection_updated", reload);
        socket.off("order_created", reload);
        socket.off("invoice_paid", onInvoicePaid);
      };
    }
  }, []);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetchLabHistoryApi(historyPage, 10, historySearch);
      if (res.success) {
        setHistoryData({ reports: res.reports, pagination: res.pagination });
      }
    } catch (e) {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "HISTORY") {
      const timer = setTimeout(() => {
        loadHistory();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [tab, historyPage, historySearch]);

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
    setPaymentMode(null);
    setIsPaid(order.status === "IN_PROGRESS");
    setPaymentStatus("IDLE");
    setPrice("500"); // Default test price
  };

  const handleSendBill = async () => {
    if (!selectedOrder) return;
    try {
      setPaymentStatus("WAITING");
      toast.info("Sending bill to patient portal...");
      await createLabBillApi(selectedOrder._id, Number(price));
      toast.success("Bill sent! Waiting for patient to pay via HealOS app...");
    } catch (e) {
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
      if (paymentMode === "ONLINE" && paymentStatus === "PAID") {
        await markLabCollectedApi(selectedOrder._id);
      } else {
        await markLabCollectedApi(selectedOrder._id, paymentMode === "ONLINE" ? "UPI" : paymentMode, Number(price));
      }
      toast.success(`Payment processed and sample collected!`);
      setIsPaid(true);
      
      setTimeout(() => {
        loadCollections();
      }, 2000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete checkout.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const validExts = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".webp"];
    if (!validExts.includes(ext) && !file.type.startsWith("image/")) {
      toast.error("Please upload a PDF, Image, or Word document.");
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      setIsUploading(prev => ({ ...prev, [id]: true }));
      toast.info("Uploading result...");
      const res = await uploadLabReportApi(id, formData);
      if (res.status === "success" || res.success) {
        toast.success("Result uploaded successfully! Sent to Validation queue.");
        setSelectedOrder(null);
        loadCollections();
      }
    } catch (error) {
      toast.error("Failed to upload result");
    } finally {
      setIsUploading(prev => ({ ...prev, [id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-muted-foreground">
        <Loader2 className="size-8 animate-spin mb-4 text-primary" />
        <p className="mono-label">Syncing Phlebotomy Queue...</p>
      </div>
    );
  }

  const upiUrl = `upi://pay?pa=lab@healos&pn=HealOS%20Pathology&am=${price}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  return (
    <section className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <PanelHeader
        index="01 / phlebotomy"
        title="Sample Collection & POS"
        note="Manage sample collections and process test billing."
        actions={
          <div className="flex bg-muted/50 p-1 rounded-md border border-border/40">
            <button
              onClick={() => { setTab("COLLECTION"); setSelectedOrder(null); }}
              className={`text-xs px-3 py-1.5 rounded transition-all ${
                tab === "COLLECTION" ? "bg-background shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Awaiting Collection
            </button>
            <button
              onClick={() => { setTab("UPLOAD"); setSelectedOrder(null); }}
              className={`text-xs px-3 py-1.5 rounded transition-all ${
                tab === "UPLOAD" ? "bg-background shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pending Upload
            </button>
            <button
              onClick={() => { setTab("HISTORY"); setSelectedOrder(null); }}
              className={`text-xs px-3 py-1.5 rounded transition-all ${
                tab === "HISTORY" ? "bg-background shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              History
            </button>
          </div>
        }
      />

      <div className="flex-1 flex flex-col lg:flex-row bg-background overflow-hidden border-t border-border/60">
        
        {tab === "HISTORY" ? (
          <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
            <div className="p-4 sm:p-6 border-b border-border/40 flex justify-between items-center bg-card/20">
              <div>
                <h2 className="font-display text-xl font-bold">Diagnostic Reports Archive</h2>
                <p className="text-sm text-muted-foreground mt-1">View finalized reports across all patients.</p>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input 
                  placeholder="Search by test name or title..." 
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full bg-background border border-border/60 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-card/20">
              {historyLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : historyData.reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <ShieldCheck className="size-10 mb-3 opacity-30" />
                  <p>No historical reports found.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {historyData.reports.map((report: any) => (
                    <div key={report._id} className="bg-background border border-border/60 p-4 rounded-xl flex items-center justify-between shadow-sm hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                          <Check className="size-5" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{report.patient?.name || "Unknown Patient"} <span className="text-muted-foreground font-normal ml-2 text-xs">MRN: {report.patient?.mrn || "N/A"}</span></p>
                          <div className="flex gap-3 text-xs text-muted-foreground mt-1 font-mono">
                            <span>{report.title || report.order?.testName}</span>
                            <span>•</span>
                            <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{report.order?.accessionNumber || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                      <a 
                        href={report.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg transition-colors"
                      >
                        <Eye className="size-3.5" /> View PDF
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {historyData.pagination.pages > 1 && (
              <div className="p-4 border-t border-border/40 bg-background flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Page {historyPage} of {historyData.pagination.pages}
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage(p => p - 1)}
                    className="p-2 border rounded hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button 
                    disabled={historyPage === historyData.pagination.pages}
                    onClick={() => setHistoryPage(p => p + 1)}
                    className="p-2 border rounded hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
        {/* Left Pane: Queue */}
        <div className="w-full lg:w-[40%] xl:w-[35%] flex flex-col border-r border-border/60 bg-background/50">
          <div className="p-4 sm:p-6 border-b border-border/40 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input 
                placeholder="Search MRN, Patient Name..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-card/60 border border-border/60 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
            {rows.filter(r => (tab === "COLLECTION" ? r.status === "PENDING" : r.status === "IN_PROGRESS") && 
                 (r.patient?.name?.toLowerCase().includes(search.toLowerCase()) || 
                  r.accessionNumber?.toLowerCase().includes(search.toLowerCase()) || 
                  r._id?.toLowerCase().includes(search.toLowerCase()))).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <TestTube className="size-10 text-muted-foreground/30 mb-3" />
                 <p className="font-medium text-foreground">Queue is empty</p>
              </div>
            ) : (
              <AnimatePresence>
                {rows.filter(r => (tab === "COLLECTION" ? r.status === "PENDING" : r.status === "IN_PROGRESS") && 
                 (r.patient?.name?.toLowerCase().includes(search.toLowerCase()) || 
                  r.accessionNumber?.toLowerCase().includes(search.toLowerCase()) || 
                  r._id?.toLowerCase().includes(search.toLowerCase()))).map((order) => {
                  const isSelected = selectedOrder?._id === order._id;
                  const patientName = order.patient?.name || "Unknown Patient";
                  
                  return (
                    <motion.button
                      layout
                      key={order._id}
                      onClick={() => handleSelectOrder(order)}
                      className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
                        isSelected 
                          ? "bg-primary text-primary-foreground shadow-lg border-primary ring-4 ring-primary/10 scale-[1.02]" 
                          : "bg-card hover:bg-muted/50 border-border/60 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <p className={`font-bold text-lg leading-tight ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                            {patientName}
                          </p>
                          <div className={`flex items-center gap-2 mt-1.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            <span className="mono-label text-[10px] uppercase tracking-wider">{order.accessionNumber || order._id.slice(-8)}</span>
                            <span className="opacity-50">•</span>
                            <span className="mono-label text-[10px]">{order.testName}</span>
                          </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full flex items-center justify-center text-xs font-bold ${
                          order.status === "IN_PROGRESS"
                            ? isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-emerald-500/10 text-emerald-600"
                            : isSelected ? "bg-primary-foreground text-primary" : "bg-rose-500/10 text-rose-500"
                        }`}>
                          {order.status === "IN_PROGRESS" ? <Check className="size-3.5" /> : order.priority}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right Pane: Checkout */}
        <div className="w-full lg:w-[60%] xl:w-[65%] flex flex-col bg-card/20 overflow-hidden relative">
          {selectedOrder ? (
            <AnimatePresence mode="wait">
              <motion.div 
                key={selectedOrder._id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full overflow-y-auto custom-scrollbar"
              >
                
                {/* 1. ORDER DETAILS */}
                <div className="p-4 sm:p-6 lg:p-8 border-b border-border/40">
                  <div className="flex items-center gap-3 mb-6">
                    <TestTube className="size-5 text-primary" />
                    <h2 className="font-display text-2xl font-bold">Lab Test Checkout</h2>
                  </div>

                  <div className={`w-full p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
                      isPaid
                        ? "bg-muted/50 border-border/40 opacity-70"
                        : "bg-background border-primary/30 shadow-sm" 
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base text-foreground">
                            {selectedOrder.testName}
                          </p>
                          {isPaid && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Collected & Billed</span>}
                        </div>
                        
                        <div className="mt-3">
                          <RackGlyph tubes={[{ colour: "var(--color-accent)", count: 1 }]} />
                          <div className="mono-label text-[10px] text-muted-foreground mt-2">
                            <span>1 × Standard Tube</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isPaid && (
                      <div className="mt-2 sm:mt-0 flex items-center justify-between sm:justify-end gap-2 sm:gap-4 pt-3 sm:pt-0 border-t sm:border-0 border-border/30">
                        <div className="flex flex-col items-start sm:items-end">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Set Price</span>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">₹</span>
                            <input 
                              type="number" 
                              disabled={isPaid}
                              value={price} 
                              onChange={(e) => setPrice(e.target.value)}
                              className="w-20 bg-card border border-border/60 rounded px-2 pl-5 py-1 text-xs font-mono outline-none focus:border-primary/50 text-right"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. POS Checkout */}
                <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col bg-background/30 pb-24 sm:pb-8">
                  
                  {isPaid ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-1 flex flex-col items-center justify-center text-center bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8"
                    >
                      {/* Accession Ticket UI */}
                      <div className="mb-6 p-6 bg-white rounded-xl shadow-sm border border-emerald-500/30 w-full max-w-sm mx-auto relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-3">Accession ID / Barcode</p>
                        
                        <div className="flex justify-center items-center h-16 w-full opacity-60 mb-3 grayscale flex-col space-y-[1px]">
                           {/* Decorative fake barcode lines */}
                           <div className="flex h-10 w-full justify-center">
                              {Array.from({ length: 30 }).map((_, i) => (
                                <div key={i} className="h-full bg-slate-800" style={{ width: `${Math.random() * 4 + 1}px`, margin: '0 1px' }} />
                              ))}
                           </div>
                           <p className="font-mono text-xl font-bold tracking-widest text-slate-800">{selectedOrder.accessionNumber || selectedOrder._id.slice(-8)}</p>
                        </div>
                        
                        <div className="text-left border-t border-slate-100 pt-3 flex justify-between items-end">
                           <div>
                             <p className="font-bold text-sm text-slate-800">{selectedOrder.patient?.name}</p>
                             <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedOrder.testName}</p>
                           </div>
                           <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">PAID</span>
                        </div>
                      </div>

                      <h2 className="font-display text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Sample Labeled & Collected</h2>
                      <p className="text-muted-foreground text-sm max-w-md">Please upload the finalized diagnostic PDF report below once the analysis is complete. <br/> <strong className="text-foreground">Uploaded reports will be sent to the Validation panel.</strong></p>
                      
                      <div className="mt-8 flex gap-3">
                         <label className={`cursor-pointer relative transition-all ${isUploading[selectedOrder._id] ? 'opacity-70 pointer-events-none' : ''}`}>
                           <input
                             type="file"
                             className="absolute hidden"
                             accept=".pdf,image/*,.doc,.docx"
                             onChange={(e) => handleUpload(selectedOrder._id, e)}
                             disabled={isUploading[selectedOrder._id]}
                           />
                           <span className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-5 text-sm font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                             {isUploading[selectedOrder._id] ? (
                               <><Loader2 className="size-4 animate-spin" /> Uploading...</>
                             ) : (
                               <><UploadCloud className="size-4" /> Upload Result PDF</>
                             )}
                           </span>
                         </label>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <h3 className="mono-label text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-6">
                        Payment Collection
                      </h3>
                      
                      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mb-8">
                        {/* Totals */}
                        <div className="flex-1 bg-background border border-border/60 p-6 rounded-2xl shadow-sm">
                          <p className="text-sm text-muted-foreground mb-1">Total Amount Due</p>
                          <div className="flex items-baseline gap-2">
                             <p className="font-mono text-5xl font-bold tracking-tighter text-foreground">₹{price}</p>
                             <p className="mono-label text-muted-foreground">.00</p>
                          </div>
                        </div>
                        
                        {/* Modes */}
                        <div className="flex-1">
                           <p className="text-sm text-muted-foreground mb-3">Select Mode</p>
                           <div className="grid grid-cols-2 gap-3">
                             <button
                               disabled={Number(price) === 0}
                               onClick={() => setPaymentMode("CASH")}
                               className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                                 paymentMode === "CASH" 
                                   ? "bg-primary text-primary-foreground border-primary shadow-md" 
                                   : "bg-background text-muted-foreground border-border/60 hover:bg-muted/50 disabled:opacity-50"
                               }`}
                             >
                               <Banknote className="size-5" />
                               <span className="text-xs font-bold uppercase tracking-wider">Cash</span>
                             </button>
                             <button
                               disabled={Number(price) === 0}
                               onClick={() => setPaymentMode("ONLINE")}
                               className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                                 paymentMode === "ONLINE" 
                                   ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20" 
                                   : "bg-background text-muted-foreground border-border/60 hover:bg-muted/50 disabled:opacity-50"
                               }`}
                             >
                               <Smartphone className="size-5" />
                               <span className="text-xs font-bold uppercase tracking-wider">Online & UPI</span>
                             </button>
                           </div>
                        </div>
                      </div>

                      {/* Dynamic Payment Area */}
                      <AnimatePresence mode="popLayout">
                        {paymentMode === "ONLINE" && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-center gap-8"
                          >
                            <div className="bg-white p-3 rounded-2xl shadow-md shrink-0">
                               <img src={qrCodeUrl} alt="UPI QR Code" className="size-32 rounded-lg" />
                            </div>
                            <div className="text-center sm:text-left w-full">
                               <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-lg mb-2">Scan to Pay via UPI</h4>
                               <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                                 The patient can scan this dynamic QR code to instantly pay <strong className="text-foreground">₹{price}</strong> from their phone.
                               </p>
                               {paymentStatus === "IDLE" && (
                                 <button 
                                   type="button"
                                   onClick={handleSendBill}
                                   className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all bg-indigo-500 text-white hover:bg-indigo-600 shadow-md"
                                 >
                                   <Send className="size-4" /> Send Bill to Patient Portal
                                 </button>
                               )}
                               {paymentStatus === "WAITING" && (
                                 <div className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                   <Loader2 className="size-4 animate-spin" /> Waiting for Payment...
                                 </div>
                               )}
                               {paymentStatus === "PAID" && (
                                 <div className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                   <Check className="size-4" /> Payment Verified
                                 </div>
                               )}
                            </div>
                          </motion.div>
                        )}
                        
                        {paymentMode === "CASH" && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 mb-8 flex items-center gap-6"
                          >
                            <div className="size-16 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                               <Banknote className="size-8" />
                            </div>
                            <div>
                              <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-lg mb-1">Collect Cash: ₹{price}</h4>
                              <p className="text-sm text-muted-foreground">Ensure exact change is received or issue balance from the float register.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="fixed sm:relative bottom-16 sm:bottom-0 left-0 right-0 sm:mt-auto pt-4 sm:pt-6 border-t border-border/40 bg-background/80 sm:bg-transparent backdrop-blur-xl sm:backdrop-blur-none p-4 sm:p-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-none">
                        <ActionButton 
                          tone="solid" 
                          onClick={handleCheckout} 
                          disabled={isProcessing || !paymentMode || Number(price) === 0 || (paymentMode === "ONLINE" && paymentStatus !== "PAID")}
                          className={`w-full py-4 sm:py-6 text-base font-bold justify-center transition-all ${
                            paymentMode === "ONLINE" ? "bg-indigo-500 hover:bg-indigo-600 text-white" : ""
                          }`}
                        >
                          {isProcessing ? (
                            <><Loader2 className="size-5 animate-spin mr-2" /> Processing Transaction...</>
                          ) : (
                            <>Complete Collection & Bill <ArrowRight className="size-5 ml-2" /></>
                          )}
                        </ActionButton>
                      </div>
                    </>
                  )}
                </div>

              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="size-24 rounded-full bg-muted/50 flex items-center justify-center mb-6 shadow-inner">
                 <ShieldCheck className="size-10 text-muted-foreground/30" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">Phlebotomy POS</h2>
              <p className="text-muted-foreground max-w-sm leading-relaxed">Select a test from the queue on the left to set prices, manage collection, and bill the patient.</p>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </section>
  );
}
