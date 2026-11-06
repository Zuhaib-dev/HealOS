"use client";

/* Hallmark · macrostructure: Workbench · genre: modern-minimal
 * audience: ward nurses · use: record obs before consult
 */

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Loader2,
  Activity,
  ChevronRight,
  ActivitySquare,
  Thermometer,
  Wind,
  Scale,
  RefreshCw,
} from "lucide-react";
import { ActionButton } from "@/components/admin/admin-shell";
import {
  fetchVitalsQueueApi,
  recordVitalsApi,
  type VitalsQueueItem,
} from "@/lib/api/nurse";
import { toast } from "sonner";
import { formatTime12Hour, formatTimeRange } from "@/lib/time-format";
import { NurseHeader } from "@/components/nurse/nurse-header";

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "number",
  icon: Icon,
  id,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  icon?: typeof Activity;
  id: string;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mono-label mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
      >
        {Icon ? <Icon className="size-3" /> : null}
        {label}
      </label>
      <input
        id={id}
        aria-label={label}
        type={type}
        inputMode={type === "number" ? "decimal" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

const emptyDraft = {
  hr: "",
  rr: "",
  spo2: "",
  temp: "",
  bp: "",
  weight: "",
  height: "",
  notes: "",
};

export function VitalsRoundsPanel() {
  const [queue, setQueue] = useState<VitalsQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const res = await fetchVitalsQueueApi();
      if (res.success) setQueue(res.queue);
    } catch (err) {
      console.error("Failed to load vitals queue", err);
      toast.error("Could not load the vitals queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

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
        toast.success("Vitals recorded");
        setOpenId(null);
        setDraft(emptyDraft);
        void loadQueue();
      }
    } catch {
      toast.error("Could not save vitals");
    } finally {
      setSaving(false);
    }
  };

  const pending = queue.filter((q) => !q.hasVitals).length;
  const recorded = queue.filter((q) => q.hasVitals).length;

  return (
    <section className="flex min-h-[calc(100vh-4rem)] flex-col pb-24 lg:pb-0">
      <NurseHeader
        title="Vitals round"
        note="Record observations before the patient sees the doctor. Ordered by appointment time."
        actions={
          <ActionButton
            onClick={() => {
              setLoading(true);
              void loadQueue();
            }}
            disabled={loading}
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </ActionButton>
        }
      />

      <div className="grid grid-cols-2 gap-px bg-border/60">
        <div className="bg-background p-4 sm:p-5">
          <p className="mono-label text-[10px] text-muted-foreground uppercase">
            In queue
          </p>
          <p className="mt-1 font-display text-2xl font-bold">{queue.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Today</p>
        </div>
        <div className="bg-background p-4 sm:p-5">
          <p className="mono-label text-[10px] text-muted-foreground uppercase">
            Recorded
          </p>
          <p className="mt-1 font-display text-2xl font-bold">{recorded}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pending} still to take
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-border/60 px-4 py-16 text-center">
            <Activity className="mb-3 size-8 text-muted-foreground/30" />
            <p className="font-medium">Queue is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No appointments for today.
            </p>
          </div>
        ) : (
          <ul className="mx-auto flex max-w-3xl flex-col gap-px bg-border/60">
            {queue.map((item) => {
              const p = item.appointment.patient;
              const isRecorded = item.hasVitals;
              const isOpen = openId === item.appointment._id;
              const v = item.vitals;

              return (
                <li key={item.appointment._id} className="bg-background">
                  <button
                    type="button"
                    onClick={() => {
                      if (isRecorded) return;
                      setOpenId(isOpen ? null : item.appointment._id);
                      setDraft(emptyDraft);
                    }}
                    className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center ${
                          isRecorded
                            ? "bg-success/15 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isRecorded ? (
                          <Check className="size-4" />
                        ) : (
                          <Activity className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground">
                          {p.name}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.appointment.queueNumber
                            ? `#${String(item.appointment.queueNumber).padStart(2, "0")} · `
                            : ""}
                          {item.appointment.arrivalTime
                            ? `Arrive ${formatTime12Hour(item.appointment.arrivalTime)} · `
                            : ""}
                          {formatTimeRange(
                            item.appointment.timeSlot,
                            item.appointment.slotEndTime,
                          )}
                          {item.appointment.department
                            ? ` · ${item.appointment.department}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-end text-xs font-medium sm:self-auto">
                      {isRecorded ? (
                        <span className="text-success">
                          {v?.heartRate ? `${v.heartRate} bpm` : "Recorded"}
                          {v?.bloodPressure ? ` · ${v.bloodPressure}` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          {isOpen ? "Close" : "Record"}
                          <ChevronRight
                            className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                          />
                        </span>
                      )}
                    </div>
                  </button>

                  {isOpen && !isRecorded ? (
                    <form
                      className="border-t border-border/40 bg-muted/20 p-4 sm:p-5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleSaveVitals(item);
                      }}
                    >
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Field
                          id={`${item.appointment._id}-hr`}
                          label="Heart rate"
                          icon={ActivitySquare}
                          value={draft.hr}
                          onChange={(v) => setDraft({ ...draft, hr: v })}
                          placeholder="bpm"
                        />
                        <Field
                          id={`${item.appointment._id}-bp`}
                          label="Blood pressure"
                          icon={Activity}
                          value={draft.bp}
                          onChange={(v) => setDraft({ ...draft, bp: v })}
                          placeholder="120/80"
                          type="text"
                        />
                        <Field
                          id={`${item.appointment._id}-spo2`}
                          label="SpO2"
                          icon={Wind}
                          value={draft.spo2}
                          onChange={(v) => setDraft({ ...draft, spo2: v })}
                          placeholder="%"
                        />
                        <Field
                          id={`${item.appointment._id}-temp`}
                          label="Temp"
                          icon={Thermometer}
                          value={draft.temp}
                          onChange={(v) => setDraft({ ...draft, temp: v })}
                          placeholder="°C"
                        />
                        <Field
                          id={`${item.appointment._id}-rr`}
                          label="Resp. rate"
                          icon={Wind}
                          value={draft.rr}
                          onChange={(v) => setDraft({ ...draft, rr: v })}
                          placeholder="/min"
                        />
                        <Field
                          id={`${item.appointment._id}-wt`}
                          label="Weight"
                          icon={Scale}
                          value={draft.weight}
                          onChange={(v) => setDraft({ ...draft, weight: v })}
                          placeholder="kg"
                        />
                        <Field
                          id={`${item.appointment._id}-ht`}
                          label="Height"
                          icon={Scale}
                          value={draft.height}
                          onChange={(v) => setDraft({ ...draft, height: v })}
                          placeholder="cm"
                        />
                      </div>
                      <label
                        htmlFor={`notes-${item.appointment._id}`}
                        className="mono-label mt-4 mb-1.5 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                      >
                        Notes
                      </label>
                      <textarea
                        id={`notes-${item.appointment._id}`}
                        value={draft.notes}
                        onChange={(e) =>
                          setDraft({ ...draft, notes: e.target.value })
                        }
                        placeholder="Optional"
                        rows={2}
                        className="w-full resize-none border border-border/60 bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div className="mt-4 flex justify-end gap-2">
                        <ActionButton
                          type="button"
                          onClick={() => setOpenId(null)}
                        >
                          Cancel
                        </ActionButton>
                        <ActionButton
                          type="submit"
                          tone="solid"
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Save vitals"
                          )}
                        </ActionButton>
                      </div>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
