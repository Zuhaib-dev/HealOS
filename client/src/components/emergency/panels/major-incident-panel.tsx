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
