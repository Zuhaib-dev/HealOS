"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check, X, PauseCircle, TriangleAlert, Droplets, Bandage, Bell } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, Sparkline, StatGrid, Td, Th, type Tone } from "@/components/workspace/ui";
import {
  callBells,
  fluidBalance,
  handover,
  marDoses,
  shiftStats,
  wounds,
  type MarDose,
} from "./nurse-data";
import {
  fetchVitalsQueueApi,
  recordVitalsApi,
  VitalsQueueItem,
} from "@/lib/api/nurse";
import { toast } from "sonner";

/* ---------- 01 vitals rounds (REAL DATA) ---------- */

export function VitalsRoundsPanel() {
  const [queue, setQueue] = useState<VitalsQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    hr: "", rr: "", spo2: "", temp: "", bp: "", weight: "", height: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

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

  if (loading) {
    return <div className="p-8 mono-label text-muted-foreground animate-pulse">Loading vitals queue...</div>;
  }

  const pending = queue.filter(q => !q.hasVitals).length;
  const recorded = queue.filter(q => q.hasVitals).length;

  return (
    <section>
      <PanelHeader
        index="01 / rounds"
        title="Vitals round"
        note="Observation rounds ordered by appointment time. Record vitals for each patient before they see the doctor."
        actions={
          <>
            <ActionButton onClick={loadQueue}>Refresh</ActionButton>
            <ActionButton tone="solid">{recorded} / {queue.length} recorded</ActionButton>
          </>
        }
      />

      <StatGrid stats={[
        { label: "Patients in queue", value: String(queue.length), note: "today's appointments" },
        { label: "Vitals recorded", value: String(recorded), note: `${pending} pending` },
      ]} />

      <div className="hairline-t grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
        {queue.length === 0 && (
          <div className="bg-background p-8 text-center text-muted-foreground mono-label lg:col-span-2">
            No patients in queue today.
          </div>
        )}

        {queue.map((item) => {
          const apt = item.appointment;
          const open = openId === apt._id;
          const patientName = apt.patient?.name || "Unknown Patient";
          const doctorName = apt.doctor?.name || "Unknown Doctor";

          return (
            <div key={apt._id} className="bg-background p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-accent/80">
                    {apt.timeSlot} · {apt.department}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold">{patientName}</p>
                  <p className="mono-label text-muted-foreground">
                    Dr. {doctorName} · {apt.reason || "OPD Consultation"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Pill tone={item.hasVitals ? "ok" : "warn"}>
                    {item.hasVitals ? "Vitals recorded ✓" : "Pending"}
                  </Pill>
                </div>
              </div>

              {/* Show existing vitals if recorded */}
              {item.hasVitals && item.vitals && (
                <div className="mono-label mt-4 grid grid-cols-5 gap-px" style={{ background: "var(--hairline)" }}>
                  {[
                    ["HR", item.vitals.heartRate ? `${item.vitals.heartRate}` : "—"],
                    ["RR", item.vitals.respiratoryRate ? `${item.vitals.respiratoryRate}` : "—"],
                    ["SpO2", item.vitals.spo2 ? `${item.vitals.spo2}%` : "—"],
                    ["Temp", item.vitals.temperature ? `${item.vitals.temperature}` : "—"],
                    ["BP", item.vitals.bloodPressure || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-background px-2 py-3 text-center">
                      <p className="text-muted-foreground">{k}</p>
                      <p className="text-foreground mt-1 font-mono text-base">{v}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recording form */}
              {open && !item.hasVitals && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="hairline grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
                    {([
                      ["hr", "HR (bpm)"],
                      ["rr", "RR"],
                      ["spo2", "SpO2 (%)"],
                      ["temp", "Temp (°C)"],
                      ["bp", "BP"],
                      ["weight", "Weight (kg)"],
                      ["height", "Height (cm)"],
                    ] as const).map(([k, label]) => (
                      <label key={k} className="mono-label text-muted-foreground">
                        {label}
                        <input
                          value={draft[k]}
                          onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                          placeholder="—"
                          className="hairline text-foreground mt-1 w-full bg-transparent px-2 py-1.5 font-mono text-sm outline-none"
                        />
                      </label>
                    ))}
                    <label className="mono-label text-muted-foreground col-span-2 sm:col-span-3">
                      Notes
                      <textarea
                        value={draft.notes}
                        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                        placeholder="Additional observations..."
                        rows={2}
                        className="hairline text-foreground mt-1 w-full bg-transparent px-2 py-1.5 font-mono text-sm outline-none resize-none"
                      />
                    </label>
                  </div>
                </motion.div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {!item.hasVitals && (
                  <>
                    <ActionButton onClick={() => setOpenId(open ? null : apt._id)}>
                      {open ? "Close set" : "Record obs"}
                    </ActionButton>
                    {open && (
                      <ActionButton tone="solid" onClick={() => handleSaveVitals(item)}>
                        {saving ? "Saving..." : "Save set"}
                      </ActionButton>
                    )}
                  </>
                )}
                {item.hasVitals && (
                  <span className="mono-label text-muted-foreground flex items-center gap-1">
                    <Check className="size-3" /> Completed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- 02 eMAR (mock data) ---------- */

const stateTone: Record<MarDose["state"], Tone> = {
  due: "info",
  overdue: "bad",
  given: "ok",
  held: "warn",
  refused: "warn",
};

export function EmarPanel() {
  const [rows, setRows] = useState(marDoses);
  const [filter, setFilter] = useState<"all" | "due" | "high" | "controlled">("all");

  const visible = rows.filter((d) =>
    filter === "all"
      ? true
      : filter === "due"
        ? d.state === "due" || d.state === "overdue"
        : filter === "high"
          ? d.highAlert
          : d.controlled,
  );

  const set = (id: string, state: MarDose["state"]) =>
    setRows((r) => r.map((d) => (d.id === id ? { ...d, state } : d)));

  return (
    <section>
      <PanelHeader
        index="02 / eMAR"
        title="Medication administration"
        note="Barcode-ready administration record. High-alert and controlled drugs demand a second signature before the dose closes."
        actions={
          <>
            <ActionButton onClick={() => setFilter("all")}>All</ActionButton>
            <ActionButton onClick={() => setFilter("due")}>Due / overdue</ActionButton>
            <ActionButton onClick={() => setFilter("high")}>High-alert</ActionButton>
            <ActionButton tone="solid" onClick={() => setFilter("controlled")}>
              Controlled
            </ActionButton>
          </>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-250">
          <thead className="hairline-b">
            <tr>
              <Th>Bed / patient</Th>
              <Th>Drug</Th>
              <Th>Dose / route</Th>
              <Th>Window</Th>
              <Th>Checks</Th>
              <Th>State</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr key={d.id} className="hairline-b hover:bg-foreground/2">
                <Td>
                  <p className="mono-label text-accent/80">{d.bed}</p>
                  <p className="font-medium">{d.patient}</p>
                </Td>
                <Td>
                  <p className="font-medium">{d.drug}</p>
                  {d.note && <p className="mono-label text-muted-foreground">{d.note}</p>}
                </Td>
                <Td>
                  <span className="font-mono">{d.dose}</span>
                  <span className="mono-label text-muted-foreground ml-2">{d.route}</span>
                </Td>
                <Td>
                  <p className="font-mono">{d.time}</p>
                  <p className="mono-label text-muted-foreground">{d.window}</p>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {d.highAlert && (
                      <Pill tone="bad">
                        <TriangleAlert className="mr-1 inline size-3" />
                        high-alert
                      </Pill>
                    )}
                    {d.controlled && <Pill tone="warn">CD register</Pill>}
                    {!d.highAlert && !d.controlled && <Pill tone="mute">standard</Pill>}
                  </div>
                </Td>
                <Td>
                  <Pill tone={stateTone[d.state]}>{d.state}</Pill>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => set(d.id, "given")} className="hairline mono-label flex items-center gap-1 px-2.5 py-1.5">
                      <Check className="size-3" /> Give
                    </button>
                    <button type="button" onClick={() => set(d.id, "held")} className="hairline mono-label flex items-center gap-1 px-2.5 py-1.5">
                      <PauseCircle className="size-3" /> Hold
                    </button>
                    <button type="button" onClick={() => set(d.id, "refused")} className="hairline mono-label text-destructive flex items-center gap-1 px-2.5 py-1.5">
                      <X className="size-3" /> Refused
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- 03 fluid balance (mock data) ---------- */

export function FluidPanel() {
  const [entries, setEntries] = useState(fluidBalance);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"oral" | "iv" | "urine" | "drain">("oral");

  const commit = (bed: string) => {
    const v = Number(amount);
    if (!v) return;
    setEntries((list) =>
      list.map((e) =>
        e.bed !== bed
          ? e
          : {
              ...e,
              intakeOral: kind === "oral" ? e.intakeOral + v : e.intakeOral,
              intakeIV: kind === "iv" ? e.intakeIV + v : e.intakeIV,
              outputUrine: kind === "urine" ? e.outputUrine + v : e.outputUrine,
              outputDrain: kind === "drain" ? e.outputDrain + v : e.outputDrain,
            },
      ),
    );
    setAmount("");
    setAddTo(null);
  };

  return (
    <section>
      <PanelHeader
        index="03 / balance"
        title="Fluid balance"
        note="Running 24-hour intake and output per bed, measured against the prescribed target and any restriction."
        actions={<ActionButton tone="solid">Close 24h chart</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
        {entries.map((e) => {
          const intake = e.intakeOral + e.intakeIV;
          const output = e.outputUrine + e.outputDrain;
          const net = intake - output;
          const onTarget = e.target <= 0 ? net <= e.target + 250 : net >= e.target - 250;
          const width = Math.min(100, (Math.abs(net) / 1800) * 100);
          return (
            <div key={e.bed} className="bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-accent/80">{e.bed}</p>
                  <p className="mt-1 font-mono text-lg font-bold">{e.patient}</p>
                </div>
                <Pill tone={onTarget ? "ok" : "bad"}>
                  net {net > 0 ? "+" : ""}{net} mL
                </Pill>
              </div>

              <div className="mono-label mt-4 grid grid-cols-4 gap-px" style={{ background: "var(--hairline)" }}>
                {[
                  ["Oral", `${e.intakeOral}`],
                  ["IV", `${e.intakeIV}`],
                  ["Urine", `${e.outputUrine}`],
                  ["Drain", `${e.outputDrain}`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-background px-2 py-3 text-center">
                    <p className="text-muted-foreground">{k}</p>
                    <p className="text-foreground mt-1 font-mono text-base">{v}</p>
                  </div>
                ))}
              </div>

              <div className="hairline mt-4 h-2 w-full">
                <motion.div
                  className={net >= 0 ? "bg-accent h-full" : "bg-destructive h-full"}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              </div>
              <p className="mono-label text-muted-foreground mt-2">
                <Droplets className="mr-1 inline size-3" />
                target {e.target > 0 ? "+" : ""}{e.target} mL
                {e.restriction ? ` · restriction ${e.restriction} mL/24h` : ""}
              </p>

              {addTo === e.bed ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {(["oral", "iv", "urine", "drain"] as const).map((k) => (
                    <button key={k} type="button" onClick={() => setKind(k)} className={`mono-label px-2.5 py-1.5 ${kind === k ? "bg-foreground text-background" : "hairline"}`}>
                      {k}
                    </button>
                  ))}
                  <input value={amount} onChange={(ev) => setAmount(ev.target.value)} placeholder="mL" className="hairline w-20 bg-transparent px-2 py-1.5 font-mono text-sm outline-none" />
                  <ActionButton tone="solid" onClick={() => commit(e.bed)}>Log</ActionButton>
                </div>
              ) : (
                <div className="mt-4">
                  <ActionButton onClick={() => setAddTo(e.bed)}>Log intake / output</ActionButton>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- 04 wound care (mock data) ---------- */

export function WoundPanel() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  return (
    <section>
      <PanelHeader
        index="04 / tissue viability"
        title="Wound care"
        note="Every open wound with stage, measured size trend, dressing regimen and the next change due."
        actions={<ActionButton tone="solid">New wound assessment</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
        {wounds.map((w) => (
          <div key={`${w.bed}-${w.site}`} className="bg-background p-5">
            <p className="mono-label text-accent/80">{w.bed}</p>
            <p className="mt-1 font-mono text-lg font-bold">{w.patient}</p>
            <p className="mono-label text-muted-foreground">{w.site} · {w.type}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="warn">{w.stage}</Pill>
              <Pill tone={w.exudate === "high" ? "bad" : "mute"}>exudate {w.exudate}</Pill>
              <Pill tone="mute">{w.size}</Pill>
            </div>

            <div className="mt-4">
              <Sparkline values={w.healing} tone={w.overdue ? "bad" : "accent"} />
              <p className="mono-label text-muted-foreground">surface area trend (cm²)</p>
            </div>

            <dl className="mono-label mt-4 space-y-1.5">
              <div className="flex justify-between"><dt className="text-muted-foreground">Dressing</dt><dd>{w.dressing}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Last change</dt><dd>{w.lastChange}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Next change</dt><dd className={w.overdue ? "text-destructive" : ""}>{w.nextChange}</dd></div>
            </dl>

            <p className="text-muted-foreground mt-3 text-sm">{w.photoNote}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton tone="solid" onClick={() => setDone((d) => ({ ...d, [w.site]: true }))}>
                {done[w.site] ? "Change logged ✓" : "Log dressing change"}
              </ActionButton>
              <ActionButton>
                <Bandage className="mr-1 inline size-3" /> Photo
              </ActionButton>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- 05 handover (mock data) ---------- */

export function HandoverPanel() {
  const [notes, setNotes] = useState(handover);
  const [draft, setDraft] = useState({ bed: "", situation: "", recommendation: "" });

  return (
    <section>
      <PanelHeader
        index="05 / handover"
        title="Shift handover"
        note="Structured SBAR per bed. Escalations sit at the top and carry to the incoming nurse with an acknowledgement."
        actions={<ActionButton tone="solid">Print bedside sheet</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-[1.6fr_1fr]" style={{ background: "var(--hairline)" }}>
        <div className="bg-background">
          {notes
            .slice()
            .sort((a, b) => (a.priority === "escalate" ? -1 : b.priority === "escalate" ? 1 : 0))
            .map((h) => (
              <div key={h.bed} className="hairline-b p-5 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="mono-label text-accent/80">{h.bed} · {h.patient}</p>
                  <Pill tone={h.priority === "escalate" ? "bad" : h.priority === "watch" ? "warn" : "ok"}>
                    {h.priority}
                  </Pill>
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    ["S", h.situation],
                    ["B", h.background],
                    ["A", h.assessment],
                    ["R", h.recommendation],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-3">
                      <dt className="mono-label text-brass w-4 shrink-0">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
        </div>

        <div className="bg-background p-5">
          <p className="mono-label text-muted-foreground">Add handover note</p>
          <input
            value={draft.bed}
            onChange={(e) => setDraft({ ...draft, bed: e.target.value })}
            placeholder="Bed (e.g. W3-12)"
            className="hairline mono-label mt-3 w-full bg-transparent px-3 py-2 outline-none"
          />
          <textarea
            value={draft.situation}
            onChange={(e) => setDraft({ ...draft, situation: e.target.value })}
            placeholder="Situation"
            rows={3}
            className="hairline mt-2 w-full resize-none bg-transparent px-3 py-2 text-sm outline-none"
          />
          <textarea
            value={draft.recommendation}
            onChange={(e) => setDraft({ ...draft, recommendation: e.target.value })}
            placeholder="Recommendation"
            rows={3}
            className="hairline mt-2 w-full resize-none bg-transparent px-3 py-2 text-sm outline-none"
          />
          <div className="mt-3">
            <ActionButton
              tone="solid"
              onClick={() => {
                if (!draft.bed.trim() || !draft.situation.trim()) return;
                setNotes((n) => [
                  {
                    bed: draft.bed,
                    patient: "New entry",
                    situation: draft.situation,
                    background: "—",
                    assessment: "—",
                    recommendation: draft.recommendation || "—",
                    priority: "watch",
                  },
                  ...n,
                ]);
                setDraft({ bed: "", situation: "", recommendation: "" });
              }}
            >
              Post to handover
            </ActionButton>
          </div>
          <p className="mono-label text-muted-foreground mt-4">
            Outgoing: Current Nurse → Incoming: Next Nurse · shift handover
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- 06 call bells (mock data) ---------- */

function fmt(s: number) {
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export function CallBellPanel() {
  const [rows, setRows] = useState(callBells);
  const waiting = useMemo(() => rows.filter((r) => r.state === "waiting"), [rows]);

  return (
    <section>
      <PanelHeader
        index="06 / call bells"
        title="Call-bell queue"
        note="Live queue by wait time. Emergency pulls rise above everything and record a response-time audit trail."
        actions={<ActionButton tone="solid">{waiting.length} waiting</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
        {rows
          .slice()
          .sort((a, b) => {
            const rank = (r: typeof a) => (r.state === "waiting" ? 0 : r.state === "accepted" ? 1 : 2);
            return rank(a) - rank(b) || b.waitedSec - a.waitedSec;
          })
          .map((c) => {
            const emergency = c.type === "emergency";
            return (
              <div key={c.id} className="bg-background p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="mono-label text-accent/80">{c.bed}</p>
                  {c.state === "waiting" && <LiveDot tone={emergency ? "bad" : "ok"} />}
                </div>
                <p className="mt-1 font-mono text-lg font-bold">{c.patient}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Pill tone={emergency ? "bad" : "info"}>
                    <Bell className="mr-1 inline size-3" />
                    {c.type}
                  </Pill>
                  <Pill tone={c.waitedSec > 120 ? "bad" : "mute"}>{fmt(c.waitedSec)}</Pill>
                  <Pill tone={c.state === "closed" ? "ok" : "warn"}>{c.state}</Pill>
                </div>
                <p className="mono-label text-muted-foreground mt-3">
                  raised {c.raised}
                  {c.acceptedBy ? ` · ${c.acceptedBy}` : ""}
                </p>
                <div className="mt-4 flex gap-2">
                  <ActionButton
                    tone="solid"
                    onClick={() =>
                      setRows((r) =>
                        r.map((x) =>
                          x.id === c.id ? { ...x, state: "accepted", acceptedBy: "You" } : x,
                        ),
                      )
                    }
                  >
                    Accept
                  </ActionButton>
                  <ActionButton
                    onClick={() =>
                      setRows((r) => r.map((x) => (x.id === c.id ? { ...x, state: "closed" } : x)))
                    }
                  >
                    Close
                  </ActionButton>
                </div>
              </div>
            );
          })}
      </div>

      <div className="hairline-t p-5 sm:px-8">
        <Card>
          <p className="mono-label text-muted-foreground">Response-time audit · this shift</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {[
              ["Median response", "48 s"],
              ["Breaches > 3 min", "1"],
              ["Bells answered", "37"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="font-mono text-2xl font-bold">{v}</p>
                <p className="mono-label text-muted-foreground">{k}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
