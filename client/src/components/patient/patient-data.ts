/* Mock fixtures for the HealOS patient portal. */

export const patient = {
  name: "Meera Joshi",
  mrn: "MRN-44219",
  age: 29,
  sex: "F",
  blood: "B+",
  phone: "+91 98•••• 4412",
  email: "meera.j@example.com",
  allergies: ["Penicillin", "Sulfa drugs"],
  conditions: ["Iron deficiency anaemia", "Migraine"],
  primary: "Dr. R. Deshmukh · Internal medicine",
  insurer: "Star Health · policy SH-88291",
};

export type Appointment = {
  id: string;
  date: string;
  time: string;
  dept: string;
  clinician: string;
  mode: "In person" | "Video" | "Home visit";
  room: string;
  state: "confirmed" | "pending" | "completed" | "cancelled" | "no-show";
  reason: string;
};

export const upcoming: Appointment[] = [
  {
    id: "a1",
    date: "04 Aug 2026",
    time: "09:15",
    dept: "Radiology",
    clinician: "US-2 · sonographer",
    mode: "In person",
    room: "US-2, level 1",
    state: "confirmed",
    reason: "USG abdomen + pelvis",
  },
  {
    id: "a2",
    date: "11 Aug 2026",
    time: "16:40",
    dept: "Internal medicine",
    clinician: "Dr. R. Deshmukh",
    mode: "Video",
    room: "Video link",
    state: "pending",
    reason: "Anaemia review + iron levels",
  },
];

export const history: Appointment[] = [
  {
    id: "h1",
    date: "18 Jul 2026",
    time: "10:00",
    dept: "Internal medicine",
    clinician: "Dr. R. Deshmukh",
    mode: "In person",
    room: "OPD-4",
    state: "completed",
    reason: "Fatigue, heavy periods — bloods ordered",
  },
  {
    id: "h2",
    date: "02 Jun 2026",
    time: "11:30",
    dept: "Neurology",
    clinician: "Dr. S. Menon",
    mode: "In person",
    room: "OPD-9",
    state: "completed",
    reason: "Migraine prophylaxis review",
  },
  {
    id: "h3",
    date: "27 Apr 2026",
    time: "08:45",
    dept: "Pathology",
    clinician: "Phlebotomy",
    mode: "In person",
    room: "Lab reception",
    state: "completed",
    reason: "Full blood count + ferritin",
  },
  {
    id: "h4",
    date: "14 Mar 2026",
    time: "15:00",
    dept: "Dermatology",
    clinician: "Dr. K. Rao",
    mode: "In person",
    room: "OPD-2",
    state: "no-show",
    reason: "Rash review",
  },
  {
    id: "h5",
    date: "09 Feb 2026",
    time: "12:20",
    dept: "Internal medicine",
    clinician: "Dr. R. Deshmukh",
    mode: "Video",
    room: "Video link",
    state: "cancelled",
    reason: "Cancelled by patient",
  },
];

export const departments = [
  { id: "med", label: "Internal medicine", clinicians: ["Dr. R. Deshmukh", "Dr. A. Bose"] },
  { id: "neuro", label: "Neurology", clinicians: ["Dr. S. Menon"] },
  { id: "rad", label: "Radiology", clinicians: ["Duty radiographer"] },
  { id: "derm", label: "Dermatology", clinicians: ["Dr. K. Rao"] },
  { id: "cardio", label: "Cardiology", clinicians: ["Dr. P. Nair", "Dr. V. Salvi"] },
];

export const slotTimes = ["09:00", "09:30", "10:15", "11:00", "14:30", "16:40", "17:20"];
export const bookedTimes = ["10:15", "14:30"];

export type PatientReport = {
  id: string;
  name: string;
  kind: "Lab report" | "Imaging report" | "Discharge summary" | "Prescription" | "Invoice";
  dept: string;
  date: string;
  size: string;
  pages: number;
  status: "ready" | "awaiting sign" | "processing";
  flagged?: boolean;
};

export const reports: PatientReport[] = [
  {
    id: "r1",
    name: "full-blood-count-18jul2026.pdf",
    kind: "Lab report",
    dept: "Pathology",
    date: "18 Jul 2026",
    size: "184 KB",
    pages: 2,
    status: "ready",
    flagged: true,
  },
  {
    id: "r2",
    name: "ferritin-iron-studies.pdf",
    kind: "Lab report",
    dept: "Pathology",
    date: "18 Jul 2026",
    size: "96 KB",
    pages: 1,
    status: "ready",
    flagged: true,
  },
  {
    id: "r3",
    name: "usg-abdomen-pelvis.pdf",
    kind: "Imaging report",
    dept: "Radiology",
    date: "pending study",
    size: "—",
    pages: 0,
    status: "processing",
  },
  {
    id: "r4",
    name: "neurology-clinic-letter.pdf",
    kind: "Discharge summary",
    dept: "Neurology",
    date: "02 Jun 2026",
    size: "142 KB",
    pages: 3,
    status: "ready",
  },
  {
    id: "r5",
    name: "prescription-iron-folate.pdf",
    kind: "Prescription",
    dept: "Internal medicine",
    date: "18 Jul 2026",
    size: "64 KB",
    pages: 1,
    status: "awaiting sign",
  },
];

export type Med = {
  name: string;
  dose: string;
  freq: string;
  started: string;
  refillsLeft: number;
  prescriber: string;
  state: "active" | "ended";
};

export const meds: Med[] = [
  {
    name: "Ferrous ascorbate + folic acid",
    dose: "100 mg",
    freq: "once daily after food",
    started: "18 Jul 2026",
    refillsLeft: 1,
    prescriber: "Dr. R. Deshmukh",
    state: "active",
  },
  {
    name: "Propranolol",
    dose: "20 mg",
    freq: "twice daily",
    started: "02 Jun 2026",
    refillsLeft: 3,
    prescriber: "Dr. S. Menon",
    state: "active",
  },
  {
    name: "Sumatriptan",
    dose: "50 mg",
    freq: "as needed, max 2/day",
    started: "02 Jun 2026",
    refillsLeft: 0,
    prescriber: "Dr. S. Menon",
    state: "active",
  },
  {
    name: "Tranexamic acid",
    dose: "500 mg",
    freq: "three times daily · 5 days",
    started: "12 Mar 2026",
    refillsLeft: 0,
    prescriber: "Dr. R. Deshmukh",
    state: "ended",
  },
];

export type Bill = {
  id: string;
  ref: string;
  date: string;
  item: string;
  amount: string;
  insurerShare: string;
  due: string;
  state: "paid" | "due" | "with insurer";
};

export const bills: Bill[] = [
  {
    id: "b1",
    ref: "INV-70233",
    date: "18 Jul 2026",
    item: "OPD consult + full blood count",
    amount: "₹2,450",
    insurerShare: "₹1,800",
    due: "₹650",
    state: "due",
  },
  {
    id: "b2",
    ref: "INV-69911",
    date: "02 Jun 2026",
    item: "Neurology consult",
    amount: "₹1,200",
    insurerShare: "₹1,200",
    due: "₹0",
    state: "paid",
  },
  {
    id: "b3",
    ref: "INV-69004",
    date: "27 Apr 2026",
    item: "Pathology panel",
    amount: "₹3,100",
    insurerShare: "₹2,480",
    due: "₹620",
    state: "with insurer",
  },
];

export type Vital = { label: string; value: string; unit: string; series: number[]; note: string };

export const vitals: Vital[] = [
  {
    label: "Haemoglobin",
    value: "10.4",
    unit: "g/dL",
    series: [8.9, 9.1, 9.4, 9.8, 10.1, 10.4],
    note: "rising on iron therapy · target 12",
  },
  {
    label: "Resting HR",
    value: "78",
    unit: "bpm",
    series: [94, 90, 88, 84, 80, 78],
    note: "settling since propranolol",
  },
  {
    label: "Blood pressure",
    value: "112/72",
    unit: "mmHg",
    series: [118, 116, 115, 114, 113, 112],
    note: "within range",
  },
  {
    label: "Weight",
    value: "58.2",
    unit: "kg",
    series: [57.1, 57.4, 57.6, 57.9, 58.0, 58.2],
    note: "stable",
  },
];

export const messages = [
  {
    id: "m1",
    from: "Dr. R. Deshmukh",
    role: "Internal medicine",
    at: "19 Jul, 08:12",
    body: "Your haemoglobin is improving. Continue the iron for eight more weeks and we will recheck ferritin at the August review.",
    unread: true,
  },
  {
    id: "m2",
    from: "Radiology scheduling",
    role: "Imaging",
    at: "31 Jul, 17:40",
    body: "Your ultrasound is booked for 04 Aug at 09:15 in US-2. Please fast for six hours and arrive fifteen minutes early.",
    unread: true,
  },
  {
    id: "m3",
    from: "Pharmacy",
    role: "Outpatient pharmacy",
    at: "18 Jul, 13:05",
    body: "Iron and folate dispensed. One repeat remaining on this prescription.",
    unread: false,
  },
];

export const careTeam = [
  { name: "Dr. R. Deshmukh", role: "Internal medicine · primary", contact: "OPD-4 · ext 2140" },
  { name: "Dr. S. Menon", role: "Neurology", contact: "OPD-9 · ext 2209" },
  { name: "Sr. L. Fernandes", role: "Care coordinator", contact: "ext 2101" },
  { name: "Outpatient pharmacy", role: "Dispensing", contact: "Level 0 · ext 2050" },
];
