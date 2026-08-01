// Mock fixtures for the clinician workspace. Frontend-only.

export type ShiftStat = { label: string; value: string; note: string };

export const shiftStats: ShiftStat[] = [
  { label: "Patients under you", value: "14", note: "3 critical · 11 stable" },
  { label: "Clinic slots today", value: "18", note: "6 seen · 2 no-show" },
  { label: "Results awaiting sign", value: "7", note: "2 flagged abnormal" },
  { label: "Time on shift", value: "4h 12m", note: "handover 19:00" },
];

export type RoundPatient = {
  mrn: string;
  name: string;
  age: number;
  sex: "M" | "F";
  bed: string;
  dx: string;
  acuity: "critical" | "guarded" | "stable";
  news2: number;
  los: string;
  tasks: string[];
  seen: boolean;
  vitals: number[];
};

export const rounds: RoundPatient[] = [
  {
    mrn: "PT-99401",
    name: "Jonas Vidal",
    age: 64,
    sex: "M",
    bed: "ICU-A · 04",
    dx: "Post-CABG day 3, AF",
    acuity: "critical",
    news2: 7,
    los: "3d",
    tasks: ["Review amiodarone dose", "Repeat ABG 12:00"],
    seen: false,
    vitals: [88, 92, 96, 104, 99, 108, 112, 106],
  },
  {
    mrn: "PT-99255",
    name: "Fatima Nadir",
    age: 45,
    sex: "F",
    bed: "ISO-B · 02",
    dx: "Pulmonary TB, airborne isolation",
    acuity: "critical",
    news2: 6,
    los: "6d",
    tasks: ["Sputum AFB result", "Contact tracing sign-off"],
    seen: false,
    vitals: [96, 94, 98, 97, 101, 99, 103, 100],
  },
  {
    mrn: "PT-99310",
    name: "Aiko Tanaka",
    age: 78,
    sex: "F",
    bed: "GEN-2 · 17",
    dx: "CAP, AKI stage 1",
    acuity: "guarded",
    news2: 4,
    los: "2d",
    tasks: ["Fluid balance review"],
    seen: true,
    vitals: [78, 80, 82, 79, 84, 81, 80, 78],
  },
  {
    mrn: "PT-99341",
    name: "Owen Brady",
    age: 52,
    sex: "M",
    bed: "SUR-1 · 09",
    dx: "Day 5 lap cholecystectomy",
    acuity: "guarded",
    news2: 3,
    los: "5d",
    tasks: ["Wound check", "Discharge planning"],
    seen: true,
    vitals: [72, 74, 71, 70, 73, 72, 71, 70],
  },
  {
    mrn: "PT-99388",
    name: "Meera Shah",
    age: 31,
    sex: "F",
    bed: "MAT-3 · 06",
    dx: "Post-partum day 1",
    acuity: "stable",
    news2: 1,
    los: "1d",
    tasks: ["Lactation review"],
    seen: true,
    vitals: [68, 70, 69, 71, 70, 69, 68, 70],
  },
  {
    mrn: "PT-99287",
    name: "Luis Ortega",
    age: 8,
    sex: "M",
    bed: "PED-1 · 03",
    dx: "Asthma exacerbation",
    acuity: "stable",
    news2: 2,
    los: "12h",
    tasks: ["Step-down salbutamol"],
    seen: false,
    vitals: [102, 104, 100, 98, 96, 95, 94, 92],
  },
];

export type ClinicSlot = {
  time: string;
  patient: string;
  mrn: string;
  reason: string;
  kind: "New" | "Follow-up" | "Tele";
  state: "done" | "in-room" | "waiting" | "no-show" | "upcoming";
};

export const clinic: ClinicSlot[] = [
  { time: "09:00", patient: "Hector Alves", mrn: "PT-98120", reason: "Chest pain workup", kind: "New", state: "done" },
  { time: "09:20", patient: "Nadia Rehman", mrn: "PT-98144", reason: "Hypertension review", kind: "Follow-up", state: "done" },
  { time: "09:40", patient: "Peter Osei", mrn: "PT-98177", reason: "Statin titration", kind: "Follow-up", state: "no-show" },
  { time: "10:00", patient: "Ilse Brandt", mrn: "PT-98201", reason: "Palpitations", kind: "New", state: "done" },
  { time: "10:20", patient: "Sanjay Rao", mrn: "PT-98233", reason: "Post-MI 6 week", kind: "Follow-up", state: "in-room" },
  { time: "10:40", patient: "Grace Whitmore", mrn: "PT-98240", reason: "Echo results", kind: "Tele", state: "waiting" },
  { time: "11:00", patient: "Yusuf Demir", mrn: "PT-98266", reason: "Syncope", kind: "New", state: "upcoming" },
  { time: "11:20", patient: "Clara Nkemdi", mrn: "PT-98291", reason: "Anticoagulation", kind: "Follow-up", state: "upcoming" },
];

export type ResultItem = {
  id: string;
  patient: string;
  mrn: string;
  test: string;
  kind: "Lab" | "Imaging" | "Path";
  value: string;
  flag: "critical" | "abnormal" | "normal";
  at: string;
};

export const results: ResultItem[] = [
  { id: "R-8841", patient: "Jonas Vidal", mrn: "PT-99401", test: "Troponin T", kind: "Lab", value: "1,284 ng/L", flag: "critical", at: "07:02" },
  { id: "R-8840", patient: "Fatima Nadir", mrn: "PT-99255", test: "Sputum AFB × 3", kind: "Path", value: "Positive", flag: "critical", at: "06:48" },
  { id: "R-8838", patient: "Aiko Tanaka", mrn: "PT-99310", test: "Creatinine", kind: "Lab", value: "162 µmol/L", flag: "abnormal", at: "06:20" },
  { id: "R-8836", patient: "Owen Brady", mrn: "PT-99341", test: "CT abdomen", kind: "Imaging", value: "No collection", flag: "normal", at: "05:55" },
  { id: "R-8834", patient: "Luis Ortega", mrn: "PT-99287", test: "Chest X-ray", kind: "Imaging", value: "Hyperinflation", flag: "abnormal", at: "05:31" },
  { id: "R-8830", patient: "Meera Shah", mrn: "PT-99388", test: "FBC", kind: "Lab", value: "Hb 11.4 g/dL", flag: "normal", at: "04:58" },
];

export type OrderItem = {
  id: string;
  patient: string;
  detail: string;
  kind: "Medication" | "Imaging" | "Lab" | "Referral";
  state: "draft" | "active" | "signed";
};

export const orders: OrderItem[] = [
  { id: "ORD-5521", patient: "Jonas Vidal", detail: "Amiodarone 200mg PO BD", kind: "Medication", state: "draft" },
  { id: "ORD-5520", patient: "Luis Ortega", detail: "Salbutamol 2 puffs 4-hourly", kind: "Medication", state: "active" },
  { id: "ORD-5518", patient: "Aiko Tanaka", detail: "Renal USS — urgent", kind: "Imaging", state: "draft" },
  { id: "ORD-5515", patient: "Owen Brady", detail: "Physiotherapy referral", kind: "Referral", state: "signed" },
  { id: "ORD-5511", patient: "Fatima Nadir", detail: "LFT + U&E daily × 5", kind: "Lab", state: "active" },
];

export const noteTemplates = [
  "Ward round note",
  "Admission history",
  "Discharge summary",
  "Procedure note",
  "Referral letter",
];

export type Handover = { at: string; from: string; text: string; priority: "high" | "normal" };

export const handovers: Handover[] = [
  { at: "06:55", from: "Dr. Oyelaran (night)", text: "Bed ICU-A 04 had two AF episodes overnight, rate controlled after 02:10. Cardiology aware.", priority: "high" },
  { at: "06:40", from: "Nurse W. Lin", text: "ISO-B 02 sputum sent; family wants an update at midday.", priority: "high" },
  { at: "06:15", from: "Dr. Menon", text: "SUR-1 09 fit for discharge tomorrow if wound clean.", priority: "normal" },
  { at: "05:50", from: "Pharmacy", text: "Two antibiotic courses expiring today — review or stop.", priority: "normal" },
];

export type OnCallDay = { day: string; shift: "Day" | "Night" | "On-call" | "Off"; unit: string };

export const onCall: OnCallDay[] = [
  { day: "Mon", shift: "Day", unit: "Ward + clinic" },
  { day: "Tue", shift: "Day", unit: "Theatre 1" },
  { day: "Wed", shift: "On-call", unit: "Cardiology" },
  { day: "Thu", shift: "Off", unit: "—" },
  { day: "Fri", shift: "Night", unit: "Acute medicine" },
  { day: "Sat", shift: "Night", unit: "Acute medicine" },
  { day: "Sun", shift: "Off", unit: "—" },
];
