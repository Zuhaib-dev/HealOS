"use client";

// Static mock data for panels that don't connect to backend yet
// Vitals Round (panel 01) uses REAL data from the backend

export type MarDose = {
  id: string;
  bed: string;
  patient: string;
  drug: string;
  dose: string;
  route: "PO" | "IV" | "IM" | "SC" | "NEB" | "TOP";
  time: string;
  window: string;
  state: "due" | "overdue" | "given" | "held" | "refused";
  highAlert?: boolean;
  controlled?: boolean;
  note?: string;
};

export const marDoses: MarDose[] = [
  {
    id: "d1",
    bed: "W3-06",
    patient: "Rahul Menon",
    drug: "Piperacillin/Tazobactam",
    dose: "4.5 g",
    route: "IV",
    time: "14:00",
    window: "13:45–14:15",
    state: "overdue",
    highAlert: true,
    note: "Second dose of sepsis bundle",
  },
  {
    id: "d2",
    bed: "W3-06",
    patient: "Rahul Menon",
    drug: "Paracetamol",
    dose: "1 g",
    route: "IV",
    time: "14:00",
    window: "13:45–14:15",
    state: "due",
  },
  {
    id: "d3",
    bed: "W3-09",
    patient: "Ayesha Khan",
    drug: "Enoxaparin",
    dose: "40 mg",
    route: "SC",
    time: "14:15",
    window: "14:00–14:30",
    state: "due",
  },
  {
    id: "d4",
    bed: "W3-09",
    patient: "Ayesha Khan",
    drug: "Oxycodone",
    dose: "5 mg",
    route: "PO",
    time: "14:30",
    window: "PRN q4h",
    state: "due",
    controlled: true,
    note: "Witness signature required",
  },
  {
    id: "d5",
    bed: "W3-11",
    patient: "Daniel Osei",
    drug: "Furosemide",
    dose: "40 mg",
    route: "IV",
    time: "13:30",
    window: "13:15–13:45",
    state: "given",
  },
  {
    id: "d6",
    bed: "W3-11",
    patient: "Daniel Osei",
    drug: "Ramipril",
    dose: "2.5 mg",
    route: "PO",
    time: "13:30",
    window: "13:15–13:45",
    state: "held",
    note: "Held — systolic 96, MO informed",
  },
  {
    id: "d7",
    bed: "W3-14",
    patient: "Lena Fischer",
    drug: "Insulin (Actrapid) infusion",
    dose: "3 units/hr",
    route: "IV",
    time: "hourly",
    window: "titrate to BGL",
    state: "due",
    highAlert: true,
  },
  {
    id: "d8",
    bed: "W3-17",
    patient: "Ibrahim Sayed",
    drug: "Fascia iliaca block top-up",
    dose: "20 mL 0.25%",
    route: "IM",
    time: "15:00",
    window: "14:45–15:15",
    state: "due",
  },
];

export type FluidEntry = {
  bed: string;
  patient: string;
  intakeOral: number;
  intakeIV: number;
  outputUrine: number;
  outputDrain: number;
  target: number;
  restriction?: number;
};

export const fluidBalance: FluidEntry[] = [
  { bed: "W3-06", patient: "Rahul Menon", intakeOral: 350, intakeIV: 1800, outputUrine: 900, outputDrain: 0, target: 800 },
  { bed: "W3-09", patient: "Ayesha Khan", intakeOral: 700, intakeIV: 500, outputUrine: 1100, outputDrain: 60, target: 0 },
  { bed: "W3-11", patient: "Daniel Osei", intakeOral: 600, intakeIV: 120, outputUrine: 1650, outputDrain: 0, target: -1000, restriction: 1200 },
  { bed: "W3-14", patient: "Lena Fischer", intakeOral: 900, intakeIV: 2400, outputUrine: 2500, outputDrain: 0, target: 500 },
];

export type Wound = {
  bed: string;
  patient: string;
  site: string;
  type: string;
  stage: string;
  size: string;
  exudate: "nil" | "low" | "moderate" | "high";
  dressing: string;
  lastChange: string;
  nextChange: string;
  healing: number[];
  photoNote: string;
  overdue: boolean;
};

export const wounds: Wound[] = [
  { bed: "W3-17", patient: "Ibrahim Sayed", site: "Sacrum", type: "Pressure injury", stage: "Stage 2", size: "3.1 × 2.4 cm", exudate: "low", dressing: "Hydrocolloid", lastChange: "Yesterday 21:10", nextChange: "Today 21:00", healing: [42, 40, 37, 33, 30, 28], photoNote: "Peri-wound intact, no odour", overdue: false },
  { bed: "W3-09", patient: "Ayesha Khan", site: "Port sites × 4", type: "Surgical", stage: "Primary closure", size: "12 mm each", exudate: "nil", dressing: "Island dressing", lastChange: "Today 08:00", nextChange: "Tomorrow 08:00", healing: [20, 18, 15, 12, 10, 8], photoNote: "Dry, edges apposed", overdue: false },
  { bed: "W3-11", patient: "Daniel Osei", site: "Right lower leg", type: "Venous ulcer", stage: "Granulating 60%", size: "5.8 × 4.2 cm", exudate: "high", dressing: "Foam + compression", lastChange: "Today 06:30", nextChange: "Today 14:00", healing: [70, 68, 66, 63, 61, 58], photoNote: "Strike-through at 06:30 — increase absorbency", overdue: true },
];

export type HandoverItem = {
  bed: string;
  patient: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  priority: "watch" | "stable" | "escalate";
};

export const handover: HandoverItem[] = [
  { bed: "W3-06", patient: "Rahul Menon", situation: "Septic, NEWS2 8, escalated 13:40.", background: "CAP day 2, on O2 4L NP, lactate 3.1.", assessment: "Tachypnoeic 26, SpO2 89% on 4L, MAP 70.", recommendation: "Hourly obs, repeat lactate 15:00, ICU outreach reviewing.", priority: "escalate" },
  { bed: "W3-11", patient: "Daniel Osei", situation: "Negative balance −1.0 L target, on track.", background: "HFrEF EF 28%, IV furosemide BD.", assessment: "Weight down 0.9 kg, mild ankle oedema.", recommendation: "Strict balance, daily weight 06:00, watch K+.", priority: "watch" },
  { bed: "W3-17", patient: "Ibrahim Sayed", situation: "Awaiting theatre, NBM from 22:00.", background: "NOF fracture, on fascia iliaca block.", assessment: "Pain 3/10 at rest, delirium screen due.", recommendation: "4AT screen this shift, pressure care 2-hourly.", priority: "stable" },
];

export type CallBell = {
  id: string;
  bed: string;
  patient: string;
  type: "call bell" | "bathroom" | "pain" | "IV alarm" | "emergency";
  raised: string;
  waitedSec: number;
  state: "waiting" | "accepted" | "closed";
  acceptedBy?: string;
};

export const callBells: CallBell[] = [
  { id: "c1", bed: "W3-06", patient: "Rahul Menon", type: "emergency", raised: "13:58", waitedSec: 42, state: "waiting" },
  { id: "c2", bed: "W3-14", patient: "Lena Fischer", type: "IV alarm", raised: "13:56", waitedSec: 168, state: "waiting" },
  { id: "c3", bed: "W3-17", patient: "Ibrahim Sayed", type: "bathroom", raised: "13:54", waitedSec: 300, state: "accepted", acceptedBy: "N. Rao" },
  { id: "c4", bed: "W3-09", patient: "Ayesha Khan", type: "pain", raised: "13:41", waitedSec: 96, state: "closed", acceptedBy: "S. Fernandes" },
];

export const shiftStats = [
  { label: "Patients on round", value: "5", note: "Ward 3 · bay A–C" },
  { label: "Obs overdue", value: "1", note: "W3-06 · 4 min" },
  { label: "Doses due < 30 min", value: "5", note: "1 high-alert" },
  { label: "Call bells waiting", value: "2", note: "Longest 2m 48s" },
];
