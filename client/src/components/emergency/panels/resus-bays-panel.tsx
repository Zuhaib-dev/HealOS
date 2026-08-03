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
