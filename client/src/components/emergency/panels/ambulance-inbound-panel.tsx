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
