"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Loader2, Pill, Search, ShieldCheck } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { fetchPendingPrescriptionsApi, PendingPrescriptionRecord } from "@/lib/api/pharmacy";
import { toast } from "sonner";

export function PastOrdersPanel() {
  const [rows, setRows] = useState<PendingPrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadHistory = async () => {
    try {
      // In a real app, there would be a dedicated `/pharmacy/orders/history` API.
      // Since we only have the pending API, we will fetch it and filter for items that have been fully dispensed.
      // For demonstration, we will assume prescriptions with all `isDispensed: true` are historical orders.
      const res = await fetchPendingPrescriptionsApi();
      if (res.success) {
        // Filter: Keep prescriptions where AT LEAST ONE medicine has been dispensed.
        // This simulates a "Past Order" log where partial or full orders are tracked.
        const historical = res.prescriptions.filter(rx => 
          rx.medicines.some(m => m.isDispensed)
        );
        setRows(historical);
      }
    } catch (e) {
      toast.error("Failed to load past orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = rows.filter(rx => 
    rx.patient?.name?.toLowerCase().includes(search.toLowerCase()) || 
    rx._id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <PanelHeader
        index="02 / history"
        title="Past Orders & Receipts"
        note="A historical ledger of all dispensed medications, billing receipts, and patient counseling logs."
        actions={<ActionButton onClick={loadHistory}>Refresh Ledger</ActionButton>}
      />

      <div className="flex-1 flex flex-col bg-background overflow-hidden border-t border-border/60">
        
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full flex-1 flex flex-col h-full">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by Patient Name or Order ID..." 
                className="w-full bg-card/60 border border-border/60 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            
            <div className="text-sm text-muted-foreground font-mono">
              Showing <strong className="text-foreground">{filtered.length}</strong> past orders
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-card/20 rounded-2xl border border-border/40 p-4">
            {loading ? (
               <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                 <Loader2 className="size-8 animate-spin mb-4 text-primary" />
                 <p className="mono-label">Loading historical ledger...</p>
               </div>
            ) : filtered.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-center">
                 <ShieldCheck className="size-10 text-muted-foreground/30 mb-3" />
                 <p className="font-medium text-foreground">No Past Orders Found</p>
                 <p className="text-sm text-muted-foreground mt-1">Dispensed prescriptions will appear here.</p>
               </div>
            ) : (
              <div className="grid gap-4">
                <AnimatePresence>
                  {filtered.map((rx) => {
                    // Count only dispensed items for the historical log
                    const dispensedMeds = rx.medicines.filter(m => m.isDispensed);
                    // Mock calculating a past total assuming 120 per item
                    const mockTotal = dispensedMeds.length * 120;
                    
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={rx._id}
                        className="bg-background border border-border/60 rounded-xl p-5 shadow-sm hover:border-primary/40 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-border/40">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-lg text-foreground">{rx.patient?.name || "Unknown Patient"}</h3>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600">PAID & DISPENSED</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="mono-label text-[10px] text-muted-foreground">Order ID: {rx._id.slice(-8).toUpperCase()}</span>
                              <span className="text-muted-foreground/30">•</span>
                              <span className="mono-label text-[10px] text-muted-foreground">{new Date(rx.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="text-right flex items-center gap-4">
                             <Dialog>
                               <DialogTrigger asChild>
                                 <ActionButton>Receipt</ActionButton>
                               </DialogTrigger>
                               <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none p-0">
                                 <div className="relative bg-card text-card-foreground p-6 pt-10 font-mono shadow-2xl rounded-sm overflow-hidden" 
                                      style={{
                                        backgroundImage: "radial-gradient(circle at top, transparent 4px, var(--card) 5px)",
                                        backgroundSize: "12px 10px",
                                        backgroundPosition: "top center",
                                        backgroundRepeat: "repeat-x"
                                      }}>
                                   <div className="absolute bottom-0 left-0 right-0 h-3 w-full"
                                        style={{
                                          backgroundImage: "radial-gradient(circle at bottom, transparent 4px, var(--card) 5px)",
                                          backgroundSize: "12px 10px",
                                          backgroundPosition: "bottom center",
                                          backgroundRepeat: "repeat-x"
                                        }}
                                   />
                                   
                                   <div className="text-center mb-6 space-y-1">
                                     <h2 className="text-xl font-bold tracking-widest uppercase">HealOS Pharmacy</h2>
                                     <p className="text-xs text-muted-foreground uppercase tracking-widest">Pharmacy Receipt</p>
                                     <div className="text-xs pt-2">
                                       RX-{rx._id.slice(-8).toUpperCase()}
                                     </div>
                                   </div>

                                   <div className="space-y-4 text-sm relative z-10 mb-4">
                                     <div className="flex justify-between items-center border-b border-dashed border-border/60 pb-3">
                                       <span className="text-muted-foreground uppercase text-xs">Date</span>
                                       <span>{new Date(rx.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                     </div>
                                     
                                     <div className="flex justify-between items-start border-b border-dashed border-border/60 pb-3">
                                       <span className="text-muted-foreground uppercase text-xs">Patient</span>
                                       <div className="text-right">
                                         <span className="font-bold">{rx.patient?.name || "Unknown Patient"}</span>
                                       </div>
                                     </div>

                                     <div className="flex justify-between items-center border-b border-dashed border-border/60 pb-3">
                                       <span className="text-muted-foreground uppercase text-xs">Status</span>
                                       <span className="font-bold uppercase tracking-wider text-emerald-500">DISPENSED</span>
                                     </div>
                                     
                                     {dispensedMeds.length > 0 && (
                                       <div className="py-2">
                                         <span className="text-muted-foreground uppercase text-xs mb-3 block">Dispensed Items</span>
                                         <div className="space-y-2">
                                           {dispensedMeds.map((item: any, idx: number) => (
                                             <div key={idx} className="flex justify-between items-start gap-4">
                                               <div>
                                                 <span className="leading-tight block font-bold">{item.name}</span>
                                                 <span className="text-[10px] text-muted-foreground">{item.dosage}</span>
                                               </div>
                                               <span>₹120</span>
                                             </div>
                                           ))}
                                         </div>
                                       </div>
                                     )}
                                   </div>

                                   <div className="border-t-2 border-dashed border-border pt-4 mt-2 pb-6 relative z-10">
                                     <div className="flex justify-between items-center">
                                       <span className="uppercase font-bold tracking-widest text-lg">Total</span>
                                       <span className="text-2xl font-bold tracking-tight">₹{mockTotal.toLocaleString()}</span>
                                     </div>
                                   </div>
                                   
                                   <div className="text-center mt-2 mb-2 pb-4 opacity-50 relative z-10">
                                     <div className="h-8 w-full flex items-center justify-center gap-0.5">
                                       {Array.from({ length: 30 }).map((_, i) => (
                                         <div key={i} className="h-full bg-foreground" style={{ width: `${Math.random() * 4 + 1}px`, opacity: Math.random() > 0.3 ? 1 : 0 }} />
                                       ))}
                                     </div>
                                     <p className="text-[10px] mt-2 uppercase tracking-widest">Thank you</p>
                                   </div>
                                 </div>
                               </DialogContent>
                             </Dialog>
                             <div className="text-right">
                               <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Total Billed</p>
                               <p className="font-mono text-2xl font-bold">₹{mockTotal}</p>
                             </div>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                          {dispensedMeds.map(m => (
                            <div key={m._id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/40">
                              <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Pill className="size-3" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-foreground">{m.name}</p>
                                <p className="text-xs text-muted-foreground">{m.dosage} · {m.frequency}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
