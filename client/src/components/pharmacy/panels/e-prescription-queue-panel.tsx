"use client";

/* Hallmark · macrostructure: Master-Detail / POS Split · genre: modern-minimal
 * states: hover, focus, loading, error, success
 * contrast: pass
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, Pill, ShieldCheck, CreditCard, Banknote, QrCode, Smartphone, Loader2, ArrowRight, ActivitySquare, AlertCircle, Search } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { fetchPendingPrescriptionsApi, dispenseMedicineApi, PendingPrescriptionRecord } from "@/lib/api/pharmacy";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

export function RxQueuePanel() {
  const [rows, setRows] = useState<PendingPrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRx, setSelectedRx] = useState<PendingPrescriptionRecord | null>(null);
  
  // POS State for selected Rx
  const [dispensedItems, setDispensedItems] = useState<Set<string>>(new Set());
  const [paymentMode, setPaymentMode] = useState<"CASH" | "ONLINE" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const loadPrescriptions = async () => {
    try {
      const res = await fetchPendingPrescriptionsApi();
      if (res.success) {
        setRows(res.prescriptions);
      }
    } catch (e) {
      toast.error("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
    const socket = getSocket();
    if (socket) {
      const reload = () => loadPrescriptions();
      socket.on("prescription_created", reload);
      socket.on("prescription_dispensed", reload);
      return () => {
        socket.off("prescription_created", reload);
        socket.off("prescription_dispensed", reload);
      };
    }
  }, []);

  // When a new Rx is selected, reset POS state
  const handleSelectRx = (rx: PendingPrescriptionRecord) => {
    setSelectedRx(rx);
    const preDispensed = new Set(rx.medicines.filter(m => m.isDispensed).map(m => m._id));
    setDispensedItems(preDispensed);
    setPaymentMode(null);
    setIsPaid(false);
  };

  const toggleDispense = (medId: string) => {
    const next = new Set(dispensedItems);
    if (next.has(medId)) next.delete(medId);
    else next.add(medId);
    setDispensedItems(next);
  };

  const totalCost = useMemo(() => {
    if (!selectedRx) return 0;
    // Assuming each medicine costs ₹120 for mockup purposes if cost isn't in DB.
    // In a real app, cost would be on the medicine record.
    return selectedRx.medicines.length * 120;
  }, [selectedRx]);

  const handleCheckout = async () => {
    if (!selectedRx) return;
    if (dispensedItems.size === 0) {
      toast.error("Please dispense at least one item.");
      return;
    }
    if (!paymentMode) {
      toast.error("Please select a payment mode.");
      return;
    }

    setIsProcessing(true);
    try {
      // In a real app, we'd hit a checkout/billing API. 
      // Here we just mark the selected medicines as dispensed via the existing API.
      // Since the API takes (consultationId, medicineId), we'll do them in parallel.
      const unDispensedIdsToDispense = selectedRx.medicines
        .filter(m => !m.isDispensed && dispensedItems.has(m._id))
        .map(m => m._id);

      const promises = unDispensedIdsToDispense.map(medId => 
        dispenseMedicineApi(selectedRx._id, medId)
      );

      await Promise.all(promises);
      
      toast.success("Payment processed and medicines dispensed!");
      setIsPaid(true);
      
      // Reload queue to reflect changes
      setTimeout(() => {
        loadPrescriptions();
      }, 2000);
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete checkout.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-muted-foreground">
        <Loader2 className="size-8 animate-spin mb-4 text-primary" />
        <p className="mono-label">Syncing Pharmacy Systems...</p>
      </div>
    );
  }

  return (
    <section className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <PanelHeader
        index="01 / dispensary"
        title="Pharmacy & POS"
        note="Integrated workflow for Rx counseling, dispensing, and billing."
        actions={<ActionButton onClick={loadPrescriptions}>Refresh Queue</ActionButton>}
      />

      <div className="flex-1 flex flex-col lg:flex-row bg-background overflow-hidden border-t border-border/60">
        
        {/* Left Pane: Rx Queue */}
        <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col border-r border-border/60 bg-background/50">
          <div className="p-4 sm:p-6 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input 
                placeholder="Search MRN, Patient Name..." 
                className="w-full bg-card/60 border border-border/60 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <Pill className="size-10 text-muted-foreground/30 mb-3" />
                 <p className="font-medium text-foreground">No Pending Rx</p>
              </div>
            ) : (
              <AnimatePresence>
                {rows.map((rx) => {
                  const isSelected = selectedRx?._id === rx._id;
                  const undispensedCount = rx.medicines.filter(m => !m.isDispensed).length;
                  
                  return (
                    <motion.button
                      layout
                      key={rx._id}
                      onClick={() => handleSelectRx(rx)}
                      className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
                        isSelected 
                          ? "bg-primary text-primary-foreground shadow-lg border-primary ring-4 ring-primary/10 scale-[1.02]" 
                          : "bg-card hover:bg-muted/50 border-border/60 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <p className={`font-bold text-lg leading-tight ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                            {rx.patient?.name || "Unknown Patient"}
                          </p>
                          <div className={`flex items-center gap-2 mt-1.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            <span className="mono-label text-[10px] uppercase tracking-wider">{rx.doctor?.name || "Unknown Dr."}</span>
                            <span className="opacity-50">•</span>
                            <span className="mono-label text-[10px]">{rx.patient?._id?.slice(-6).toUpperCase()}</span>
                          </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full flex items-center justify-center text-xs font-bold ${
                          undispensedCount === 0 
                            ? isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-emerald-500/10 text-emerald-600"
                            : isSelected ? "bg-primary-foreground text-primary" : "bg-rose-500/10 text-rose-500"
                        }`}>
                          {undispensedCount === 0 ? <Check className="size-3.5" /> : `${undispensedCount} Items`}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right Pane: Dispense & POS Checkout */}
        <div className="w-full lg:w-[55%] xl:w-[60%] flex flex-col bg-card/20 overflow-hidden relative">
          {selectedRx ? (
            <AnimatePresence mode="wait">
              <motion.div 
                key={selectedRx._id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full overflow-y-auto custom-scrollbar"
              >
                
                {/* 1. Header & Counsel */}
                <div className="p-6 sm:p-8 lg:p-10 border-b border-border/40">
                  <div className="flex items-center gap-3 mb-2">
                    <ShieldCheck className="size-5 text-emerald-500" />
                    <h2 className="font-display text-2xl font-bold">Counsel & Dispense</h2>
                  </div>
                  <p className="text-muted-foreground text-sm max-w-lg mb-8">
                    Review the doctor's prescription with <span className="font-semibold text-foreground">{selectedRx.patient?.name}</span>. Check off items as you bag them.
                  </p>

                  <div className="grid gap-3">
                    {selectedRx.medicines.map((med, idx) => {
                      const isGiven = dispensedItems.has(med._id);
                      const isLocked = med.isDispensed; // Already dispensed previously
                      
                      return (
                        <button
                          key={med._id}
                          disabled={isLocked || isPaid}
                          onClick={() => toggleDispense(med._id)}
                          className={`w-full text-left p-4 rounded-xl border flex items-start gap-4 transition-all duration-300 ${
                            isLocked
                              ? "bg-muted/50 border-border/40 opacity-70 cursor-not-allowed"
                              : isGiven 
                                ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20" 
                                : "bg-background border-border/60 hover:border-primary/40 cursor-pointer shadow-sm"
                          }`}
                        >
                          <div className={`size-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isGiven || isLocked ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30 text-transparent"
                          }`}>
                            <Check className="size-3.5" strokeWidth={3} />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <p className={`font-bold text-base ${isGiven || isLocked ? "text-foreground" : "text-foreground"}`}>
                                {med.name}
                              </p>
                              {isLocked && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Already Given</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="mono-label text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded">{med.dosage}</span>
                              <span className="mono-label text-[10px] text-muted-foreground">{med.frequency} · {med.duration}</span>
                            </div>
                            {med.instructions && (
                              <p className="text-xs text-muted-foreground mt-2 italic flex items-center gap-1.5">
                                <ActivitySquare className="size-3" /> Dr. Note: {med.instructions}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. POS Checkout */}
                <div className="p-6 sm:p-8 lg:p-10 flex-1 flex flex-col bg-background/30">
                  <h3 className="mono-label text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-6">
                    Payment Collection
                  </h3>
                  
                  {isPaid ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-1 flex flex-col items-center justify-center text-center bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8"
                    >
                      <div className="size-16 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-500/20">
                        <Check className="size-8" strokeWidth={3} />
                      </div>
                      <h2 className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Transaction Complete</h2>
                      <p className="text-muted-foreground">Medicines dispensed and receipt generated.</p>
                      <ActionButton className="mt-8 bg-background" onClick={() => setSelectedRx(null)}>Next Patient</ActionButton>
                    </motion.div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-8 lg:gap-12 mb-8">
                        {/* Totals */}
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-1">Total Amount Due</p>
                          <div className="flex items-baseline gap-2">
                             <p className="font-mono text-5xl font-bold tracking-tighter text-foreground">₹{totalCost}</p>
                             <p className="mono-label text-muted-foreground">.00</p>
                          </div>
                          <p className="text-xs text-rose-500 mt-2 font-medium flex items-center gap-1">
                             <AlertCircle className="size-3" /> Insurance not verified
                          </p>
                        </div>
                        
                        {/* Modes */}
                        <div className="flex-1">
                           <p className="text-sm text-muted-foreground mb-3">Select Mode</p>
                           <div className="grid grid-cols-2 gap-3">
                             <button
                               onClick={() => setPaymentMode("CASH")}
                               className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                                 paymentMode === "CASH" 
                                   ? "bg-primary text-primary-foreground border-primary shadow-md" 
                                   : "bg-background text-muted-foreground border-border/60 hover:bg-muted/50"
                               }`}
                             >
                               <Banknote className="size-5" />
                               <span className="text-xs font-bold uppercase tracking-wider">Cash</span>
                             </button>
                             <button
                               onClick={() => setPaymentMode("ONLINE")}
                               className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                                 paymentMode === "ONLINE" 
                                   ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20" 
                                   : "bg-background text-muted-foreground border-border/60 hover:bg-muted/50"
                               }`}
                             >
                               <Smartphone className="size-5" />
                               <span className="text-xs font-bold uppercase tracking-wider">Online</span>
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
                            className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 mb-8 flex items-center gap-6"
                          >
                            <div className="bg-white p-3 rounded-xl shadow-sm shrink-0">
                               <QrCode className="size-20 text-indigo-950" strokeWidth={1.5} />
                            </div>
                            <div>
                               <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-lg mb-1">Scan to Pay via UPI</h4>
                               <p className="text-sm text-muted-foreground leading-relaxed">
                                 The bill has been sent to the patient's HealOS app. They can scan this code or pay directly from their phone.
                               </p>
                            </div>
                          </motion.div>
                        )}
                        {paymentMode === "CASH" && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 mb-8"
                          >
                            <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-lg mb-1">Collect Cash</h4>
                            <p className="text-sm text-muted-foreground">Ensure exact change or issue balance from float.</p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="mt-auto pt-6 border-t border-border/40">
                        <ActionButton 
                          tone="solid" 
                          onClick={handleCheckout} 
                          disabled={isProcessing || !paymentMode || dispensedItems.size === 0}
                          className={`w-full py-6 text-base font-bold justify-center transition-all ${
                            paymentMode === "ONLINE" ? "bg-indigo-500 hover:bg-indigo-600 text-white" : ""
                          }`}
                        >
                          {isProcessing ? (
                            <><Loader2 className="size-5 animate-spin mr-2" /> Processing...</>
                          ) : (
                            <>Complete Checkout & Dispense <ArrowRight className="size-5 ml-2" /></>
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
              <div className="size-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                 <ShieldCheck className="size-10 text-muted-foreground/30" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">Pharmacy Console</h2>
              <p className="text-muted-foreground max-w-sm">Select a prescription from the queue on the left to review instructions, dispense medicines, and collect payment.</p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
