"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Ambulance, Siren, AlertTriangle, Check } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot, Pill, StatGrid, Td, Th, Toggle, type Tone } from "@/components/workspace/ui";

type Esi = 1 | 2 | 3 | 4 | 5;

const triage: {
  id: string;
  patient: string;
  age: number;
  sex: "M" | "F";
  complaint: string;
  esi: Esi;
  arrived: string;
  waitMin: number;
  area: string;
  obs: string;
  disposition: "awaiting triage" | "in bay" | "awaiting bed" | "for discharge";
}[] = [
  { id: "ED-4412", patient: "Unknown male", age: 55, sex: "M", complaint: "Cardiac arrest · ROSC en route", esi: 1, arrived: "13:58", waitMin: 0, area: "Resus 1", obs: "HR 118 · BP 84/50 · SpO2 91%", disposition: "in bay" },
  { id: "ED-4411", patient: "Sana Qureshi", age: 34, sex: "F", complaint: "Severe asthma, silent chest", esi: 2, arrived: "13:44", waitMin: 3, area: "Resus 2", obs: "RR 32 · SpO2 88% · PEF 30%", disposition: "in bay" },
  { id: "ED-4409", patient: "Tom Whelan", age: 68, sex: "M", complaint: "Central chest pain, ST changes", esi: 2, arrived: "13:31", waitMin: 6, area: "Acute 4", obs: "HR 96 · BP 148/88 · Trop pending", disposition: "awaiting bed" },
  { id: "ED-4408", patient: "Meera Joshi", age: 41, sex: "F", complaint: "RIF pain, vomiting", esi: 3, arrived: "13:10", waitMin: 32, area: "Majors 7", obs: "HR 102 · T 38.1", disposition: "in bay" },
  { id: "ED-4405", patient: "Kofi Mensah", age: 23, sex: "M", complaint: "Ankle injury, weight-bearing", esi: 4, arrived: "12:41", waitMin: 61, area: "Minors", obs: "obs normal", disposition: "in bay" },
  { id: "ED-4402", patient: "Elsie Barnes", age: 79, sex: "F", complaint: "Mechanical fall, no LOC", esi: 3, arrived: "12:12", waitMin: 88, area: "Waiting", obs: "HR 84 · BP 132/70", disposition: "awaiting triage" },
];

const esiTone = (e: Esi): Tone => (e <= 2 ? "bad" : e === 3 ? "warn" : "mute");

const edStats = [
  { label: "In department", value: "34", note: "6 majors · 2 resus" },
  { label: "Awaiting triage", value: "2", note: "longest 88 min" },
  { label: "Time to clinician", value: "18 min", note: "median, target 30" },
  { label: "4-hour breaches", value: "3", note: "2 awaiting bed" },
];

/* ---------- 01 triage board ---------- */

export function TriageBoardPanel() {
  const [filter, setFilter] = useState<"all" | "esi12" | "waiting">("all");
  const rows = triage.filter((t) =>
    filter === "all" ? true : filter === "esi12" ? t.esi <= 2 : t.disposition === "awaiting triage",
  );

  return (
    <section>
      <PanelHeader
        index="01 / triage"
        title="ESI triage board"
        note="Live department board sorted by acuity. ESI 1–2 pulse until a clinician is assigned; waits count against the four-hour standard."
        actions={
          <>
            <ActionButton onClick={() => setFilter("all")}>All</ActionButton>
            <ActionButton onClick={() => setFilter("waiting")}>Awaiting triage</ActionButton>
            <ActionButton tone="solid" onClick={() => setFilter("esi12")}>
              ESI 1–2
            </ActionButton>
          </>
        }
      />

      <StatGrid stats={edStats} />

      <div className="hairline-t overflow-x-auto">
        <table className="w-full min-w-250">
          <thead className="hairline-b">
            <tr>
              <Th>ID</Th>
              <Th>Patient</Th>
              <Th>Presenting complaint</Th>
              <Th>ESI</Th>
              <Th>Observations</Th>
              <Th>Area</Th>
              <Th>Wait</Th>
              <Th>Disposition</Th>
            </tr>
          </thead>
          <tbody>
            {rows
              .slice()
              .sort((a, b) => a.esi - b.esi || b.waitMin - a.waitMin)
              .map((t) => (
                <tr key={t.id} className="hairline-b hover:bg-foreground/2">
                  <Td><span className="mono-label">{t.id}</span></Td>
                  <Td>
                    <p className="font-medium">{t.patient}</p>
                    <p className="mono-label text-muted-foreground">{t.age}{t.sex} · arrived {t.arrived}</p>
                  </Td>
                  <Td>{t.complaint}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      {t.esi <= 2 && <LiveDot tone="bad" />}
                      <Pill tone={esiTone(t.esi)}>ESI {t.esi}</Pill>
                    </span>
                  </Td>
                  <Td><span className="mono-label text-muted-foreground">{t.obs}</span></Td>
                  <Td><span className="mono-label">{t.area}</span></Td>
                  <Td>
                    <span className={`font-mono ${t.waitMin > 60 ? "text-destructive" : ""}`}>{t.waitMin}′</span>
                  </Td>
                  <Td>
                    <Pill tone={t.disposition === "awaiting triage" ? "bad" : "info"}>{t.disposition}</Pill>
                  </Td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- 02 resus bays ---------- */

const bays = [
  { id: "Resus 1", state: "occupied", patient: "Unknown male · post-arrest", team: "Dr. Varma + 3", clock: "12 min", airway: "ETT 8.0", lines: "IO humeral, R IJ", next: "Repeat gas 14:20" },
  { id: "Resus 2", state: "occupied", patient: "Sana Qureshi · asthma", team: "Dr. Bose + 2", clock: "26 min", airway: "NIV mask", lines: "2 × 18G", next: "Mg infusion running" },
  { id: "Resus 3", state: "ready", patient: "—", team: "—", clock: "—", airway: "checked 12:00", lines: "trolley stocked", next: "Available" },
  { id: "Resus 4", state: "cleaning", patient: "—", team: "Housekeeping", clock: "4 min", airway: "restock due", lines: "—", next: "Ready ~14:15" },
];

export function ResusPanel() {
  return (
    <section>
      <PanelHeader
        index="02 / resus"
        title="Resus bays"
        note="Bay-by-bay state with team, running resus clock, airway and access, plus the next timed intervention."
        actions={<ActionButton tone="solid">Call resus team</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-2" style={{ background: "var(--hairline)" }}>
        {bays.map((b) => {
          const occupied = b.state === "occupied";
          return (
            <div key={b.id} className="bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="mono-label text-accent/80">{b.id}</p>
                  <p className="mt-1 font-mono text-lg font-bold">{b.patient}</p>
                </div>
                <Pill tone={occupied ? "bad" : b.state === "ready" ? "ok" : "warn"}>{b.state}</Pill>
              </div>

              <svg viewBox="0 0 200 44" className="mt-3 h-11 w-full">
                <line x1="0" y1="22" x2="200" y2="22" stroke="var(--hairline)" />
                {occupied && (
                  <motion.path
                    d="M0 22 H60 l6 -14 l6 28 l6 -14 H200"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="1.4"
                    initial={{ pathLength: 0, opacity: 0.4 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </svg>

              <dl className="mono-label mt-2 space-y-1.5">
                {[
                  ["Team", b.team],
                  ["Clock", b.clock],
                  ["Airway", b.airway],
                  ["Access", b.lines],
                  ["Next", b.next],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton>Open resus chart</ActionButton>
                {occupied && <ActionButton tone="solid">Handover to ICU</ActionButton>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- 03 ambulance inbound ---------- */

const inbound = [
  { unit: "AMB-21", etaMin: 3, complaint: "STEMI, pre-alert", esi: 1 as Esi, crew: "Paramedic Shah", obs: "HR 52 · BP 92/60 · anterior ST↑", prealert: true, progress: 0.86 },
  { unit: "AMB-07", etaMin: 9, complaint: "RTC, ?pelvic fracture", esi: 2 as Esi, crew: "Paramedic Cole", obs: "HR 110 · BP 104/68 · GCS 15", prealert: true, progress: 0.58 },
  { unit: "AMB-14", etaMin: 17, complaint: "Elderly fall, hip pain", esi: 3 as Esi, crew: "Tech Grewal", obs: "obs stable", prealert: false, progress: 0.3 },
];

export function InboundPanel() {
  const [ack, setAck] = useState<Record<string, boolean>>({});
  return (
    <section>
      <PanelHeader
        index="03 / inbound"
        title="Ambulance inbound"
        note="Every unit en route with ETA, pre-alert status and the crew's handover summary so the receiving team is standing ready."
        actions={<ActionButton tone="solid">{inbound.filter((i) => i.prealert).length} pre-alerts</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-3" style={{ background: "var(--hairline)" }}>
        {inbound.map((i) => (
          <div key={i.unit} className="bg-background p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="mono-label text-accent/80">
                <Ambulance className="mr-1 inline size-3" />
                {i.unit}
              </p>
              {i.prealert && <Pill tone="bad">pre-alert</Pill>}
            </div>
            <p className="mt-2 font-mono text-3xl font-bold">{i.etaMin}′</p>
            <p className="mono-label text-muted-foreground">estimated arrival</p>

            <svg viewBox="0 0 200 24" className="mt-4 h-6 w-full">
              <line x1="4" y1="16" x2="196" y2="16" stroke="var(--hairline)" />
              <rect x="188" y="6" width="8" height="10" fill="none" stroke="var(--color-accent)" />
              <motion.circle
                cy="16"
                r="3.5"
                fill="var(--color-accent)"
                initial={{ cx: 6 }}
                animate={{ cx: 6 + 180 * i.progress }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />
            </svg>

            <p className="mt-3 text-sm">{i.complaint}</p>
            <p className="mono-label text-muted-foreground mt-2">{i.obs}</p>
            <p className="mono-label text-muted-foreground mt-1">{i.crew}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone={esiTone(i.esi)}>ESI {i.esi}</Pill>
              <ActionButton tone="solid" onClick={() => setAck((a) => ({ ...a, [i.unit]: true }))}>
                {ack[i.unit] ? "Bay assigned ✓" : "Assign bay"}
              </ActionButton>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- 04 major incident ---------- */

const cascade = [
  "Declare major incident to switchboard (dial 2222)",
  "Open casualty clearing area and label triage sieve packs",
  "Stand up second theatre and recall on-call surgical team",
  "Discharge-to-assess sweep on wards 2, 3 and 5",
  "Open blood bank major haemorrhage protocol",
  "Notify regional control and press office",
];

export function MajorIncidentPanel() {
  const [armed, setArmed] = useState(false);
  const [steps, setSteps] = useState<boolean[]>(cascade.map(() => false));
  const doneCount = steps.filter(Boolean).length;

  return (
    <section>
      <PanelHeader
        index="04 / escalation"
        title="Disaster / mass-casualty mode"
        note="Arming this mode switches the department to triage-sieve capture, releases surge capacity and drives the action cascade."
        actions={<ActionButton tone="solid">Print cascade card</ActionButton>}
      />

      <div className="grid gap-px lg:grid-cols-[1fr_1.2fr]" style={{ background: "var(--hairline)" }}>
        <div className="bg-background p-5 sm:p-8">
          <div className="hairline flex items-center justify-between gap-4 p-5">
            <div>
              <p className="mono-label text-muted-foreground">Major incident mode</p>
              <p className={`mt-1 font-mono text-2xl font-bold ${armed ? "text-destructive" : ""}`}>
                {armed ? "ARMED" : "STANDBY"}
              </p>
            </div>
            <Toggle on={armed} onChange={setArmed} />
          </div>

          {armed && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
              <Card>
                <p className="mono-label text-destructive">
                  <Siren className="mr-1 inline size-3 animate-pulse" />
                  Surge capacity released
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  {[
                    ["Surge beds", "+42"],
                    ["Theatres armed", "3"],
                    ["Staff recalled", "68"],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="font-mono text-2xl font-bold">{v}</p>
                      <p className="mono-label text-muted-foreground">{k}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          <div className="mono-label text-muted-foreground mt-5 space-y-2">
            <p>
              <AlertTriangle className="mr-1 inline size-3" />
              Triage sieve: P1 immediate · P2 urgent · P3 delayed · P4 expectant
            </p>
            <p>Commander: ED consultant · Loggist: assigned at activation</p>
          </div>
        </div>

        <div className="bg-background p-5 sm:p-8">
          <div className="flex items-center justify-between">
            <p className="mono-label text-muted-foreground">Action cascade</p>
            <Pill tone={doneCount === cascade.length ? "ok" : "warn"}>
              {doneCount} / {cascade.length}
            </Pill>
          </div>
          <ul className="mt-4 space-y-2">
            {cascade.map((c, i) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => setSteps((s) => s.map((x, j) => (j === i ? !x : x)))}
                  className="hairline flex w-full items-center gap-3 p-3 text-left"
                >
                  <span
                    className={`grid size-4 shrink-0 place-items-center ${steps[i] ? "bg-accent text-background" : "hairline"}`}
                  >
                    {steps[i] && <Check className="size-3" />}
                  </span>
                  <span className="text-sm">{c}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
