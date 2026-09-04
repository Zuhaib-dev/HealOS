"use client";

/* Hallmark · macrostructure: Stacked Cards · genre: modern-minimal
 * states: hover, focus, loading, error
 * contrast: pass
 */

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, Loader2, Activity, ChevronRight, ActivitySquare, Thermometer, Wind, Scale, Edit3, ArrowRight } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { StatGrid } from "@/components/workspace/ui";
import { fetchVitalsQueueApi, recordVitalsApi, VitalsQueueItem } from "@/lib/api/nurse";
import { toast } from "sonner";

export function VitalsRoundsPanel() {
  const [queue, setQueue] = useState<VitalsQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    hr: "", rr: "", spo2: "", temp: "", bp: "", weight: "", height: "", notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPending = isSubmitting;
  const saving = isSubmitting;
  const setSaving = setIsSubmitting;

  const loadQueue = async () => {
    try {
      const res = await fetchVitalsQueueApi();
      if (res.success) setQueue(res.queue);
    } catch (err) {
      console.error("Failed to load vitals queue", err);
      toast.error("Failed to load vitals queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQueue(); }, []);

  const handleSaveVitals = async (item: VitalsQueueItem) => {
    setSaving(true);
    try {
      const res = await recordVitalsApi({
        patientId: item.appointment.patient._id,
        appointmentId: item.appointment._id,
        heartRate: draft.hr ? Number(draft.hr) : undefined,
        respiratoryRate: draft.rr ? Number(draft.rr) : undefined,
        spo2: draft.spo2 ? Number(draft.spo2) : undefined,
        temperature: draft.temp ? Number(draft.temp) : undefined,
        bloodPressure: draft.bp || undefined,
        weight: draft.weight ? Number(draft.weight) : undefined,
        height: draft.height ? Number(draft.height) : undefined,
        notes: draft.notes || undefined,
      });
      if (res.success) {
        toast.success("Vitals recorded successfully");
        setOpenId(null);
        setDraft({ hr: "", rr: "", spo2: "", temp: "", bp: "", weight: "", height: "", notes: "" });
        loadQueue();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save vitals");
    } finally {
      setSaving(false);
    }
  };

  const pending = queue.filter(q => !q.hasVitals).length;
  const recorded = queue.filter(q => q.hasVitals).length;

  const FloatingInput = ({ 
    label, value, onChange, placeholder, type = "number", icon: Icon, id
  }: { 
    label: string, value: string, onChange: (val: string) => void, placeholder?: string, type?: string, icon?: any, id?: string
  }) => {
    const inputId = id || `vitals-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    return (
      <div className="relative group flex-1">
        <label htmlFor={inputId} className="mono-label text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5 group-focus-within:text-primary transition-colors">
          {Icon && <Icon className="size-3" />}
          {label}
        </label>
        <input
          id={inputId}
          aria-label={label}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground outline-none transition-all duration-300 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
        />
      </div>
    );
  };

  return (
    <section className="pb-24 lg:pb-0 min-h-[calc(100vh-4rem)] flex flex-col">
      <PanelHeader
        index="01 / rounds"
        title="Vitals Round"
        note="Observation rounds ordered by appointment time. Record vitals before the patient sees the doctor."
        actions={
          <div className="flex items-center gap-2">
            <ActionButton onClick={loadQueue} disabled={loading}>
               {loading ? <Loader2 className="size-4 animate-spin" /> : "Refresh Queue"}
            </ActionButton>
          </div>
        }
      />

      <StatGrid stats={[
        { label: "Patients in queue", value: String(queue.length), note: "today's appointments" },
        { label: "Vitals recorded", value: String(recorded), note: `${pending} pending` },
      ]} />

      <div className="flex-1 bg-background/50 p-4 sm:p-6 lg:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
               <Loader2 className="size-8 animate-spin mb-4 text-primary" />
               <p className="mono-label">Loading vitals queue...</p>
             </div>
          ) : queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/60 rounded-3xl bg-card/30">
               <Activity className="size-10 text-muted-foreground/30 mb-4" />
               <p className="font-medium text-foreground">Queue is empty</p>
               <p className="text-sm text-muted-foreground mt-1">No pending appointments for today.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {queue.map((item) => {
                  const p = item.appointment.patient;
                  const isRecorded = item.hasVitals;
                  const isOpen = openId === item.appointment._id;

                  return (
                    <motion.div
                      layout
                      key={item.appointment._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`relative overflow-hidden rounded-2xl border transition-all ${
                        isRecorded 
                          ? "bg-emerald-500/5 border-emerald-500/20" 
                          : isOpen 
                            ? "bg-card border-primary/50 shadow-md ring-4 ring-primary/5"
                            : "bg-card/50 border-border/60 hover:border-primary/30"
                      }`}
                    >
                      {/* Card Header (Always visible) */}
                      <button
                        type="button"
                        onClick={() => !isRecorded && setOpenId(isOpen ? null : item.appointment._id)}
                        className="w-full text-left p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset rounded-none"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`size-12 rounded-full flex items-center justify-center shrink-0 ${
                            isRecorded ? "bg-emerald-500/20 text-emerald-600" : isOpen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}>
                            {isRecorded ? <Check className="size-5" /> : <Activity className="size-5" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground text-lg">{p.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="mono-label text-[10px] text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                                {new Date(item.appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-muted-foreground/30">•</span>
                              <span className="text-xs text-muted-foreground font-medium truncate max-w-37.5 sm:max-w-50">
                                {item.appointment.department}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-auto">
                          {isRecorded ? (
                             <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                               <Check className="size-3.5" /> Recorded
                             </span>
                          ) : (
                            <div className={`flex items-center gap-2 transition-transform duration-300 ${isOpen ? "rotate-90 text-primary" : "text-muted-foreground"}`}>
                              <span className="text-xs font-semibold">{isOpen ? "Close" : "Record Vitals"}</span>
                              <ChevronRight className="size-4" />
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Expandable Form Content */}
                      <AnimatePresence>
                        {isOpen && !isRecorded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border/40 bg-background/50 overflow-hidden"
                          >
                            <div className="p-4 sm:p-6 lg:p-8">
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                                <FloatingInput label="Heart Rate" icon={ActivitySquare} value={draft.hr} onChange={(v) => setDraft({...draft, hr: v})} placeholder="BPM" />
                                <FloatingInput label="Blood Pressure" icon={Activity} value={draft.bp} onChange={(v) => setDraft({...draft, bp: v})} placeholder="e.g. 120/80" type="text" />
                                <FloatingInput label="SpO2" icon={Wind} value={draft.spo2} onChange={(v) => setDraft({...draft, spo2: v})} placeholder="%" />
                                <FloatingInput label="Temperature" icon={Thermometer} value={draft.temp} onChange={(v) => setDraft({...draft, temp: v})} placeholder="°C or °F" />
                                <FloatingInput label="Resp. Rate" icon={Wind} value={draft.rr} onChange={(v) => setDraft({...draft, rr: v})} placeholder="/min" />
                                <FloatingInput label="Weight" icon={Scale} value={draft.weight} onChange={(v) => setDraft({...draft, weight: v})} placeholder="kg" />
                                <FloatingInput label="Height" icon={Scale} value={draft.height} onChange={(v) => setDraft({...draft, height: v})} placeholder="cm" />
                              </div>

                              <div className="mb-8">
                                <label htmlFor={`notes-${item.appointment._id}`} className="mono-label text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1.5">
                                  <Edit3 className="size-3" /> Additional Notes
                                </label>
                                <textarea
                                  id={`notes-${item.appointment._id}`}
                                  aria-label="Additional Notes"
                                  value={draft.notes}
                                  onChange={(e) => setDraft({...draft, notes: e.target.value})}
                                  placeholder="Patient appears stable, no distress..."
                                  rows={2}
                                  className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 resize-none"
                                />
                              </div>

                              <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                                <ActionButton onClick={() => setOpenId(null)}>Cancel</ActionButton>
                                <ActionButton tone="solid" onClick={() => handleSaveVitals(item)} disabled={isSubmitting} className="px-6 relative overflow-hidden">
                                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : (
                                    <>Save & Complete <ArrowRight className="size-4 ml-1.5" /></>
                                  )}
                                </ActionButton>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
