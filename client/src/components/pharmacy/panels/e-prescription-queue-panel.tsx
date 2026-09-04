"use client";

/* Hallmark · macrostructure: Master-Detail / POS Split · genre: modern-minimal
 * states: hover, focus, loading, error, success
 * contrast: pass
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, Pill, ShieldCheck, CreditCard, Banknote, QrCode, Smartphone, Loader2, ArrowRight, ActivitySquare, AlertCircle, Search, Plus, Minus, Send } from "lucide-react";
import { fetchPendingPrescriptionsApi, dispenseMedicineApi, createPharmacyBillApi, PendingPrescriptionRecord } from "@/lib/api/pharmacy";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
import { OpdReceiptModal } from "@/components/doctor/shared/opd-receipt-modal";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";

// Local types for POS cart state
type CartItem = {
  id: string;          // medicineId or custom ID
  name: string;        // Drug name
  isPrescribed: boolean; // True if from Dr, False if OTC
  price: number;
  quantity: number;
  selected: boolean;   // If true, it will be dispensed and billed
  isLocked: boolean;   // If true, was already dispensed previously
  instructions?: string;
  dosage?: string;
};

export function RxQueuePanel() {
  const [rows, setRows] = useState<PendingPrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRx, setSelectedRx] = useState<PendingPrescriptionRecord | null>(null);
  
  // POS State for selected Rx
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "ONLINE" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"IDLE" | "WAITING" | "PAID">("IDLE");

  // Custom Item Modal/State
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
      
      const onInvoicePaid = () => {
        setPaymentStatus(prev => {
          if (prev === "WAITING") {
             toast.success("Online payment verified by backend! You may now dispense.");
             return "PAID";
          }
          return prev;
        });
      };
      socket.on("invoice_paid", onInvoicePaid);
      
      return () => {
        socket.off("prescription_created", reload);
        socket.off("prescription_dispensed", reload);
        socket.off("invoice_paid", onInvoicePaid);
      };
    }
  }, []);

  // When a new Rx is selected, reset POS state and populate cart
  const handleSelectRx = (rx: PendingPrescriptionRecord) => {
    setSelectedRx(rx);
    setPaymentMode(null);
    setIsPaid(false);
    setPaymentStatus("IDLE");
    setShowCustomInput(false);
    
    // Populate cart with prescribed items
    const initialCart: CartItem[] = rx.medicines.map(m => ({
      id: m._id,
      name: m.name,
      isPrescribed: true,
      price: 120, // Default fallback price
      quantity: 1,
      selected: m.isDispensed ? true : false,
      isLocked: m.isDispensed || false,
      instructions: m.instructions,
      dosage: m.dosage
    }));
    
    setCart(initialCart);
  };

  const updateCartItem = (id: string, updates: Partial<CartItem>) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const addCustomItem = () => {
    if (!customName.trim() || !customPrice || isNaN(Number(customPrice))) {
      toast.error("Please enter a valid name and price.");
      return;
    }
    
    const newItem: CartItem = {
      id: `custom_${Date.now()}`,
      name: customName,
      isPrescribed: false,
      price: Number(customPrice),
      quantity: 1,
      selected: true,
      isLocked: false,
    };
    
    setCart(prev => [...prev, newItem]);
    setCustomName("");
    setCustomPrice("");
    setShowCustomInput(false);
    toast.success("Added OTC item to cart.");
  };

  const totalCost = useMemo(() => {
    return cart.reduce((total, item) => {
      // We don't charge for items that were already locked (dispensed in a previous session)
      if (item.selected && !item.isLocked) {
        return total + (item.price * item.quantity);
      }
      return total;
    }, 0);
  }, [cart]);

  const handleSendBill = async () => {
    if (!selectedRx) return;
    try {
      setPaymentStatus("WAITING");
      toast.info("Sending bill to patient portal...");
      
      const itemsToBill = cart.filter(m => m.selected && !m.isLocked);
      await createPharmacyBillApi(selectedRx._id, itemsToBill, totalCost);
      toast.success("Bill sent! Waiting for patient to pay via HealOS app...");
      
      // Real socket event will flip the status to PAID
    } catch (e) {
      toast.error("Failed to send bill.");
      setPaymentStatus("IDLE");
    }
  };

  const handleCheckout = async () => {
    if (!selectedRx) return;
    const itemsToDispense = cart.filter(m => m.selected && !m.isLocked && m.isPrescribed);
    
    if (itemsToDispense.length === 0 && !cart.some(m => m.selected && !m.isLocked && !m.isPrescribed)) {
      toast.error("Cart is empty.");
      return;
    }
    
    if (!paymentMode) {
      toast.error("Please select a payment mode.");
      return;
    }

    setIsProcessing(true);
    try {
      // Hit backend API for prescribed items
      const promises = itemsToDispense.map(item => 
        dispenseMedicineApi(selectedRx._id, item.id)
      );

      await Promise.all(promises);
      
      toast.success(`Payment of ₹${totalCost} processed successfully!`);
      setIsPaid(true);
      
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

  // Dynamic UPI URL for the QR code
  const upiUrl = `upi://pay?pa=pharmacy@healos&pn=HealOS%20Pharmacy&am=${totalCost}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  return (
    <section className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <PanelHeader
        index="01 / dispensary"
        title="Pharmacy & POS"
        note="Integrated workflow for Rx counseling, cart management, and billing."
        actions={<ActionButton onClick={loadPrescriptions}>Refresh Queue</ActionButton>}
      />

      <div className="flex-1 flex flex-col lg:flex-row bg-background overflow-hidden border-t border-border/60">
        
        {/* Left Pane: Rx Queue */}
        <div className="w-full lg:w-[40%] xl:w-[35%] flex flex-col border-r border-border/60 bg-background/50">
          <div className="p-4 sm:p-6 border-b border-border/40">
            <div className="relative">
              <label htmlFor="pharmacy-queue-search" className="sr-only">Search MRN, Patient Name</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input 
                id="pharmacy-queue-search"
                aria-label="Search MRN, Patient Name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search MRN, Patient Name..." 
                className="w-full bg-card/60 border border-border/60 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
            {rows.filter((rx) => rx.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || rx._id.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <Pill className="size-10 text-muted-foreground/30 mb-3" />
                 <p className="font-medium text-foreground">No Pending Rx</p>
              </div>
            ) : (
              <AnimatePresence>
                {rows
                  .filter((rx) => rx.patient?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || rx._id.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((rx) => {
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
        <div className="w-full lg:w-[60%] xl:w-[65%] flex flex-col bg-card/20 overflow-hidden relative">
          {selectedRx ? (
            <AnimatePresence mode="wait">
              <motion.div 
                key={selectedRx._id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full overflow-y-auto custom-scrollbar"
              >
                
                {/* 1. CART & COUNSELING */}
                <div className="p-4 sm:p-6 lg:p-8 border-b border-border/40">
                  <div className="flex items-center justify-between gap-4 mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck className="size-5 text-emerald-500" />
                        <h2 className="font-display text-2xl font-bold">Checkout Cart</h2>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-muted-foreground text-sm max-w-lg">
                          Manage items for <span className="font-semibold text-foreground">{selectedRx.patient?.name}</span>. Set prices and adjust quantities.
                        </p>
                        <button 
                          onClick={() => setShowReceipt(true)}
                          className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200 flex items-center gap-1 font-semibold shadow-sm whitespace-nowrap"
                        >
                          <ActivitySquare className="size-3.5" />
                          View Full Receipt
                        </button>
                      </div>
                    </div>
                    
                    {!isPaid && (
                      <button 
                        onClick={() => setShowCustomInput(!showCustomInput)}
                        className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-bold uppercase tracking-wider"
                      >
                        <Plus className="size-3.5" /> Add OTC Item
                      </button>
                    )}
                  </div>

                  {/* Add Custom Item Modal Inline */}
                  <AnimatePresence>
                    {showCustomInput && !isPaid && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="bg-background border border-border/60 rounded-xl p-4 overflow-hidden"
                      >
                        <div className="flex flex-col sm:flex-row gap-3">
                          <label htmlFor="pharmacy-custom-name" className="sr-only">Medicine Name</label>
                          <input 
                            id="pharmacy-custom-name"
                            aria-label="Medicine Name"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder="Medicine Name (e.g. Paracetamol)"
                            className="flex-1 bg-card border border-border/60 rounded-lg px-3 py-2 text-sm outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary/50"
                          />
                          <div className="relative">
                            <label htmlFor="pharmacy-custom-price" className="sr-only">Price</label>
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">₹</span>
                            <input 
                              id="pharmacy-custom-price"
                              aria-label="Price in rupees"
                              type="number"
                              value={customPrice}
                              onChange={(e) => setCustomPrice(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") addCustomItem();
                              }}
                              placeholder="Price"
                              className="w-24 bg-card border border-border/60 rounded-lg pl-7 pr-3 py-2 text-sm outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary/50 font-mono"
                            />
                          </div>
                          <ActionButton tone="solid" onClick={addCustomItem}>Add</ActionButton>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Cart Items List */}
                  <div className="grid gap-3">
                    {cart.map((item) => {
                      return (
                        <div
                          key={item.id}
                          className={`w-full p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
                            item.isLocked
                              ? "bg-muted/50 border-border/40 opacity-70"
                              : item.selected 
                                ? "bg-background border-primary/30 shadow-sm" 
                                : "bg-card border-border/40 opacity-60 grayscale"
                          }`}
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            <button
                              type="button"
                              disabled={item.isLocked || isPaid}
                              onClick={() => updateCartItem(item.id, { selected: !item.selected })}
                              aria-label={item.selected ? `Deselect ${item.name}` : `Select ${item.name}`}
                              className={`size-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                                item.selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40 text-transparent hover:border-emerald-500/50"
                              }`}
                            >
                              <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                              <span className="sr-only">{item.selected ? `Deselect ${item.name}` : `Select ${item.name}`}</span>
                            </button>
                            
                            <div>
                              <div className="flex items-center gap-2">
                                <p className={`font-bold text-base ${item.selected ? "text-foreground" : "text-foreground"}`}>
                                  {item.name}
                                </p>
                                {!item.isPrescribed && <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded">OTC</span>}
                                {item.isLocked && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Already Billed</span>}
                              </div>
                              
                              {item.isPrescribed && item.dosage && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="mono-label text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded">{item.dosage}</span>
                                </div>
                              )}
                              
                              {item.instructions && (
                                <p className="text-xs text-muted-foreground mt-2 italic flex items-center gap-1.5 bg-background/50 p-2 rounded-lg border border-border/40">
                                  <ActivitySquare className="size-3 text-primary/70" /> Dr. Note: {item.instructions}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Pricing & Quantity Controls */}
                          {!item.isLocked && (
                            <div className={`mt-2 sm:mt-0 flex items-center justify-between sm:justify-end gap-2 sm:gap-4 pt-3 sm:pt-0 border-t sm:border-0 border-border/30 ${!item.selected ? "pointer-events-none opacity-50" : ""}`}>
                              <div className="flex flex-col items-start sm:items-end">
                                <label htmlFor={`cart-item-price-${item.id}`} className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Price</label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">₹</span>
                                  <input 
                                    id={`cart-item-price-${item.id}`}
                                    aria-label={`Price for ${item.name}`}
                                    type="number" 
                                    disabled={isPaid}
                                    value={item.price} 
                                    onChange={(e) => updateCartItem(item.id, { price: Number(e.target.value) })}
                                    className="w-16 sm:w-20 bg-card border border-border/60 rounded px-1 sm:px-2 pl-5 py-1.5 sm:py-1 text-xs font-mono outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus:border-primary/50 text-right"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col items-center sm:items-end">
                                <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Qty</span>
                                <div className="flex items-center gap-1 sm:gap-2 border border-border/60 bg-card rounded p-1 sm:p-0.5">
                                  <button 
                                    type="button"
                                    aria-label={`Decrease quantity for ${item.name}`}
                                    disabled={item.quantity <= 1 || isPaid}
                                    onClick={() => updateCartItem(item.id, { quantity: item.quantity - 1 })}
                                    className="p-1 sm:p-1 rounded bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                                  >
                                    <Minus className="size-3" aria-hidden="true" />
                                    <span className="sr-only">Decrease quantity</span>
                                  </button>
                                  <span className="font-mono text-xs w-4 sm:w-6 text-center">{item.quantity}</span>
                                  <button 
                                    type="button"
                                    aria-label={`Increase quantity for ${item.name}`}
                                    disabled={isPaid}
                                    onClick={() => updateCartItem(item.id, { quantity: item.quantity + 1 })}
                                    className="p-1 sm:p-1 rounded bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                                  >
                                    <Plus className="size-3" aria-hidden="true" />
                                    <span className="sr-only">Increase quantity</span>
                                  </button>
                                </div>
                              </div>
                              
                              <div className="w-16 sm:w-20 text-right">
                                <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground block mb-1">Subtotal</span>
                                <span className="font-mono font-bold text-sm sm:text-base">₹{item.price * item.quantity}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                      <div className="size-16 rounded-full bg-emerald-500 flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-500/20">
                        <Check className="size-8" strokeWidth={3} />
                      </div>
                      <h2 className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Transaction Complete</h2>
                      <p className="text-muted-foreground">₹{totalCost} collected and items dispensed.</p>
                      <ActionButton className="mt-8 bg-background" onClick={() => setSelectedRx(null)}>Next Patient</ActionButton>
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
                             <p className="font-mono text-5xl font-bold tracking-tighter text-foreground">₹{totalCost}</p>
                             <p className="mono-label text-muted-foreground">.00</p>
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Items in cart</span>
                            <span className="font-bold">{cart.filter(c => c.selected && !c.isLocked).length}</span>
                          </div>
                        </div>
                        
                        {/* Modes */}
                        <div className="flex-1">
                           <p className="text-sm text-muted-foreground mb-3">Select Mode</p>
                           <div className="grid grid-cols-2 gap-3">
                             <button
                               disabled={totalCost === 0}
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
                               disabled={totalCost === 0}
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
                               {/* Dynamic QR Code */}
                               <img src={qrCodeUrl} alt="UPI QR Code" className="size-32 rounded-lg" />
                            </div>
                            <div className="text-center sm:text-left w-full">
                               <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-lg mb-2">Scan to Pay via UPI</h4>
                               <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                                 The patient can scan this dynamic QR code to instantly pay <strong className="text-foreground">₹{totalCost}</strong> from their phone.
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
                              <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-lg mb-1">Collect Cash: ₹{totalCost}</h4>
                              <p className="text-sm text-muted-foreground">Ensure exact change is received or issue balance from the float register.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="fixed sm:relative bottom-16 sm:bottom-0 left-0 right-0 sm:mt-auto pt-4 sm:pt-6 border-t border-border/40 bg-background/80 sm:bg-transparent backdrop-blur-xl sm:backdrop-blur-none p-4 sm:p-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-none">
                        <ActionButton 
                          tone="solid" 
                          onClick={handleCheckout} 
                          disabled={isProcessing || !paymentMode || totalCost === 0 || (paymentMode === "ONLINE" && paymentStatus !== "PAID")}
                          className={`w-full py-4 sm:py-6 text-base font-bold justify-center transition-all ${
                            paymentMode === "ONLINE" ? "bg-indigo-500 hover:bg-indigo-600 text-white" : ""
                          }`}
                        >
                          {isProcessing ? (
                            <><Loader2 className="size-5 animate-spin mr-2" /> Processing Transaction...</>
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
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-card/30">
              <Banknote className="size-16 text-muted-foreground/20 mb-4" />
              <h3 className="font-display text-2xl font-bold text-foreground mb-2">No Rx Selected</h3>
              <p className="text-muted-foreground max-w-sm">
                Select a pending prescription from the queue to view its contents, add items, and process the checkout.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {showReceipt && selectedRx && (
        <OpdReceiptModal
          consultation={selectedRx}
          patient={selectedRx.patient}
          doctor={selectedRx.doctor}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </section>
  );
}
