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
