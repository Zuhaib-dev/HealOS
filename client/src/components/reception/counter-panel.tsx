"use client";

/* Hallmark · macrostructure: Workbench · genre: modern-minimal
 * states: hover
 * contrast: pass
 */

import { useEffect, useState } from "react";
import { Banknote, CreditCard, Landmark, Check, AlertCircle, Loader2 } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Td, Th } from "@/components/workspace/ui";
import { fetchPendingBillsApi, payBillApi, InvoiceRecord } from "@/lib/api/reception";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "motion/react";

export function CounterPanel() {
  const [bills, setBills] = useState<InvoiceRecord[]>([]);
  const [paid, setPaid] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"CASH" | "CARD" | "UPI" | "INSURANCE">("UPI");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [isFetching, setIsFetching] = useState(true);

  const loadBills = async () => {
    try {
      const res = await fetchPendingBillsApi();
      if (res.status === "success") {
        setBills(res.data.invoices);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadBills();
    const socket = getSocket();
    if (socket) {
      const handleUpdate = () => loadBills();
      socket.on("invoice_updated", handleUpdate);
      socket.on("invoice_created", handleUpdate);
      return () => {
        socket.off("invoice_updated", handleUpdate);
        socket.off("invoice_created", handleUpdate);
      };
    }
  }, []);

  const handlePay = async (id: string) => {
    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await payBillApi(id, mode);
      if (res.status === "success") {
        toast.success("Payment successful!");
        setPaid((prev) => ({ ...prev, [id]: mode }));
        setTimeout(loadBills, 2500);
      }
    } catch (e) {
      toast.error("Failed to process payment");
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <section className="pb-24 lg:pb-0 h-[calc(100vh-4rem)] flex flex-col">
      <PanelHeader
        index="04 / cash & billing"
        title="Front Counter"
        note="Settle OPD consultations, lab tests, and pharmacy bills. Live integration with payer APIs for instant claim adjudication."
      />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-background overflow-hidden relative">
        
        {/* Main Billing Queue */}
        <div className="flex-1 overflow-y-auto custom-scrollbar border-r border-border/60 p-4 sm:p-6 lg:p-8">
          <h2 className="mono-label text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-6">
            Pending Queue
          </h2>
          
          {isFetching ? (
            <div className="flex items-center justify-center h-48">
               <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border/60 rounded-2xl bg-muted/20">
               <Check className="size-8 text-emerald-500/50 mb-3" />
               <p className="font-medium text-muted-foreground">Queue is clear.</p>
               <p className="text-xs text-muted-foreground/70 mt-1">No pending invoices.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {bills.map((b) => {
                  const net = b.totalAmount - (b.insuranceCoverage || 0);
                  const isPaid = paid[b._id];
                  const isLoading = loading[b._id];

                  return (
                    <motion.div
                      key={b._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`relative overflow-hidden rounded-2xl border transition-all ${
                        isPaid 
                          ? "bg-emerald-500/5 border-emerald-500/20" 
                          : "bg-card/50 border-border/60 hover:shadow-sm hover:border-primary/30"
                      }`}
                    >
                      {/* Responsive Card Layout */}
                      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`size-10 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 ${isPaid ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                            {b._id.slice(-4).toUpperCase()}
                          </div>
                          
                          <div>
                            <p className="font-semibold text-foreground">{b.patient?.name || "Unknown Patient"}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <p className="mono-label text-[10px] text-muted-foreground">{b.patient?.phone || "No phone"}</p>
                               <span className="text-muted-foreground/30">•</span>
                               <span className="mono-label text-[10px] text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">
                                 {b.items.map(i => i.description).join(", ")}
                               </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between lg:justify-end gap-6 mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/40">
                           <div className="text-left lg:text-right">
                             <p className="mono-label text-[10px] text-muted-foreground uppercase tracking-wider">Total Due</p>
                             <div className="flex items-baseline gap-2 mt-0.5">
                                <span className={`font-mono text-xl font-bold tracking-tight ${isPaid ? "text-emerald-600" : "text-foreground"}`}>
                                  ₹{net}
                                </span>
                                {b.insuranceCoverage ? (
                                  <span className="text-xs text-muted-foreground line-through decoration-rose-500/50">₹{b.totalAmount}</span>
                                ) : null}
                             </div>
                           </div>
                           
                           <div>
                             {isPaid ? (
                               <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs rounded-full">
                                 <Check className="size-3.5" /> Paid via {isPaid}
                               </div>
                             ) : (
                               <ActionButton 
                                 disabled={isLoading} 
                                 tone="solid" 
                                 onClick={() => handlePay(b._id)}
                                 className="px-6 relative overflow-hidden"
                               >
                                 {isLoading ? <Loader2 className="size-4 animate-spin" /> : `Collect ₹${net}`}
                               </ActionButton>
                             )}
                           </div>
                        </div>

                      </div>

                      {/* TPA Note */}
                      {b.payer === "insurance" && !isPaid && (
                        <div className="bg-blue-500/5 border-t border-blue-500/10 px-5 py-2.5 flex items-center gap-2">
                          <AlertCircle className="size-3.5 text-blue-500" />
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            TPA Coverage Applied: ₹{b.insuranceCoverage}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Sidebar: Terminal & Float */}
        <div className="w-full lg:w-80 bg-card/20 flex flex-col shrink-0 overflow-y-auto">
          
          <div className="p-6">
            <h3 className="mono-label text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">
              Terminal Mode
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "UPI", icon: Landmark, label: "UPI fast tag" },
                { id: "CARD", icon: CreditCard, label: "Card terminal" },
                { id: "CASH", icon: Banknote, label: "Cash drawer" },
                { id: "INSURANCE", icon: Check, label: "Direct Billing" },
              ].map((m) => {
                const isActive = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id as any)}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center gap-3 ${
                      isActive 
                        ? "bg-primary border-primary text-primary-foreground shadow-md scale-[1.02]" 
                        : "bg-background border-border/60 text-muted-foreground hover:bg-muted/50 hover:border-border"
                    }`}
                  >
                    <m.icon className={`size-5 ${isActive ? "text-primary-foreground" : "text-foreground/70"}`} />
                    <span className={`text-[11px] font-bold tracking-wide ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
                      {m.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-auto p-6 border-t border-border/60 bg-background/50">
            <h3 className="mono-label text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">
              Shift Reconcile
            </h3>
            <div className="bg-background rounded-xl border border-border/60 p-5 shadow-sm">
               <p className="mono-label text-[10px] text-muted-foreground mb-1">Float Status (Cash + Drawer)</p>
               <div className="flex items-end justify-between">
                  <p className="font-mono text-3xl font-bold tracking-tight text-foreground">₹12,400</p>
                  <p className="text-xs font-semibold text-rose-500 mb-1">-₹2,600</p>
               </div>
               <div className="w-full h-1.5 bg-muted rounded-full mt-4 overflow-hidden">
                 <div className="h-full bg-primary rounded-full" style={{ width: '82%' }} />
               </div>
               <p className="text-[10px] font-mono text-muted-foreground mt-2 text-right">Target: ₹15,000</p>
               
               <ActionButton className="w-full mt-5 bg-muted hover:bg-muted/80 text-foreground border-border/60 justify-center">
                 Close Shift
               </ActionButton>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
