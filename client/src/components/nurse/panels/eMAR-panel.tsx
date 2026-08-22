"use client";

/* Hallmark · macrostructure: Stacked Cards · genre: modern-minimal
 * states: hover, loading, error, success
 * contrast: pass
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, PauseCircle, TriangleAlert, Pill as PillIcon, Loader2, Clock, AlertCircle } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { fetchMarDosesApi, type MarDose } from "@/lib/api/nurse";
import { toast } from "sonner";

export function EmarPanel() {
  const [rows, setRows] = useState<MarDose[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "due" | "high" | "controlled">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMarDosesApi()
      .then((data) => {
        setRows(data.doses);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load medication records");
        setLoading(false);
      });
  }, []);

  const visible = rows.filter((d) =>
    filter === "all"
      ? true
      : filter === "due"
        ? d.state === "due" || d.state === "overdue"
        : filter === "high"
          ? d.highAlert
          : d.controlled,
  );

  const setDoseState = async (id: string, state: MarDose["state"]) => {
    setProcessingId(id);
    if (state === "given") {
      try {
        const { administerMarDoseApi } = await import("@/lib/api/nurse");
        await administerMarDoseApi(id);
        toast.success("Dose administered and logged.");
      } catch (err) {
        toast.error("Failed to log administration.");
        setProcessingId(null);
        return;
      }
    }
    setRows((r) => r.map((d) => (d._id === id ? { ...d, state } : d)));
    setProcessingId(null);
  };

  const getStateStyles = (state: MarDose["state"]) => {
    switch (state) {
      case "due": return "bg-primary/10 text-primary border-primary/20";
      case "overdue": return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "given": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "held": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "refused": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <section className="pb-24 lg:pb-0 min-h-[calc(100vh-4rem)] flex flex-col">
      <PanelHeader
        index="02 / eMAR"
        title="Medication Administration"
        note="Barcode-ready administration record. High-alert and controlled drugs demand a second signature before the dose closes."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All" },
              { id: "due", label: "Due / Overdue" },
              { id: "high", label: "High-alert" },
              { id: "controlled", label: "Controlled" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
                  filter === f.id 
                    ? "bg-foreground text-background border-foreground shadow-sm scale-105" 
                    : "bg-background text-muted-foreground border-border/60 hover:bg-muted/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 bg-background/50 p-4 sm:p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
               <Loader2 className="size-8 animate-spin mb-4 text-primary" />
               <p className="mono-label">Loading medication records...</p>
             </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/60 rounded-3xl bg-card/30">
               <Check className="size-10 text-emerald-500/50 mb-4" />
               <p className="font-medium text-foreground">All caught up</p>
               <p className="text-sm text-muted-foreground mt-1">No medication records match this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              <AnimatePresence>
                {visible.map((d) => (
                  <motion.div
                    layout
                    key={d._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`relative flex flex-col overflow-hidden rounded-2xl border transition-all ${
                      d.state === "given" 
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : d.state === "overdue"
                          ? "bg-rose-500/5 border-rose-500/30 ring-1 ring-rose-500/10 shadow-sm"
                          : "bg-card/50 border-border/60 hover:border-primary/30"
                    }`}
                  >
                    
                    {/* Header */}
                    <div className="p-5 border-b border-border/40 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-muted flex items-center justify-center font-mono text-xs font-bold text-foreground">
                          {d.bed}
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">{d.patient}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="mono-label text-[10px] text-muted-foreground bg-background border border-border/60 px-2 py-0.5 rounded flex items-center gap-1">
                              <Clock className="size-3" /> {d.time}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${getStateStyles(d.state)}`}>
                        {d.state === "given" && <Check className="size-3" />}
                        {d.state === "overdue" && <AlertCircle className="size-3" />}
                        {d.state}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex-1 flex flex-col justify-center">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-xl shrink-0 ${d.highAlert ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"}`}>
                          <PillIcon className="size-6" />
                        </div>
                        <div>
                          <p className="font-bold text-lg text-foreground leading-tight">{d.drug}</p>
                          <p className="font-mono text-sm text-primary mt-1">{d.dose} <span className="text-muted-foreground ml-1">{d.route}</span></p>
                          {d.note && (
                            <p className="text-xs text-muted-foreground mt-2 italic bg-background/50 p-2 rounded-lg border border-border/40">
                              Note: {d.note}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-5">
                        {d.highAlert && (
                          <span className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <TriangleAlert className="size-3" /> High-Alert
                          </span>
                        )}
                        {d.controlled && (
                          <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                            CD Register
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-background/30 border-t border-border/40">
                      {d.state === "due" || d.state === "overdue" ? (
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            disabled={processingId === d._id}
                            onClick={() => setDoseState(d._id, "given")} 
                            className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            {processingId === d._id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                            <span className="text-[10px] font-bold uppercase tracking-wider">Give</span>
                          </button>
                          
                          <button 
                            disabled={processingId === d._id}
                            onClick={() => setDoseState(d._id, "held")} 
                            className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                          >
                            <PauseCircle className="size-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Hold</span>
                          </button>

                          <button 
                            disabled={processingId === d._id}
                            onClick={() => setDoseState(d._id, "refused")} 
                            className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                          >
                            <X className="size-4" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Refuse</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-2.5 text-muted-foreground">
                          <Check className="size-4 opacity-50" />
                          <span className="text-xs font-semibold">Processed</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
