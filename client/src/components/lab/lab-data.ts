export type Collection = {
  id: string;
  patient: string;
  mrn: string;
  location: string;
  tests: string;
  tubes: { type: string; colour: string; count: number }[];
  fasting: boolean;
  priority: "stat" | "urgent" | "routine";
  requested: string;
  collected: boolean;
};

export const collections: Collection[] = [
  {
    id: "REQ-77410",
    patient: "Rahul Menon",
    mrn: "MRN-448120",
    location: "W3-06",
    tests: "Lactate, CRP, blood culture ×2, FBC",
    tubes: [
      { type: "Culture bottles", colour: "var(--color-accent)", count: 4 },
      { type: "EDTA", colour: "#7f9cf5", count: 1 },
      { type: "Fluoride oxalate", colour: "#d1a15a", count: 1 },
    ],
    fasting: false,
    priority: "stat",
    requested: "13:50",
    collected: false,
  },
  {
    id: "REQ-77404",
    patient: "Daniel Osei",
    mrn: "MRN-446119",
    location: "W3-11",
    tests: "U&E, Mg, BNP",
    tubes: [{ type: "SST gold", colour: "#d1a15a", count: 2 }],
    fasting: false,
    priority: "urgent",
    requested: "13:31",
    collected: false,
  },
  {
    id: "REQ-77398",
    patient: "Priya Nair",
    mrn: "MRN-443871",
    location: "OPD-2",
    tests: "HbA1c, lipid profile, TFT",
    tubes: [
      { type: "EDTA", colour: "#7f9cf5", count: 1 },
      { type: "SST gold", colour: "#d1a15a", count: 1 },
    ],
    fasting: true,
    priority: "routine",
    requested: "12:58",
    collected: true,
  },
  {
    id: "REQ-77391",
    patient: "Lena Fischer",
    mrn: "MRN-449220",
    location: "W3-14",
    tests: "VBG, ketones, U&E",
    tubes: [{ type: "Blood gas syringe", colour: "#e06c6c", count: 1 }],
    fasting: false,
    priority: "urgent",
    requested: "12:40",
    collected: true,
  },
];

export type Sample = {
  accession: string;
  reqId: string;
  patient: string;
  discipline: "Biochemistry" | "Haematology" | "Microbiology" | "Histopathology" | "Immunology";
  panel: string;
  received: string;
  stage: "accessioned" | "on-analyser" | "validated" | "released" | "rejected";
  analyser: string;
  tatMin: number;
  slaMin: number;
  rejectReason?: string;
};

export const samples: Sample[] = [
  {
    accession: "ACC-2026-04411",
    reqId: "REQ-77410",
    patient: "Rahul Menon",
    discipline: "Biochemistry",
    panel: "Lactate + CRP",
    received: "13:56",
    stage: "on-analyser",
    analyser: "Cobas 8000 · CH-1",
    tatMin: 18,
    slaMin: 40,
  },
  {
    accession: "ACC-2026-04410",
    reqId: "REQ-77410",
    patient: "Rahul Menon",
    discipline: "Microbiology",
    panel: "Blood culture ×2",
    received: "13:56",
    stage: "accessioned",
    analyser: "BacT/ALERT · MB-2",
    tatMin: 18,
    slaMin: 1440,
  },
  {
    accession: "ACC-2026-04407",
    reqId: "REQ-77404",
    patient: "Daniel Osei",
    discipline: "Biochemistry",
    panel: "U&E + Mg + BNP",
    received: "13:40",
    stage: "validated",
    analyser: "Cobas 8000 · CH-2",
    tatMin: 34,
    slaMin: 60,
  },
  {
    accession: "ACC-2026-04402",
    reqId: "REQ-77391",
    patient: "Lena Fischer",
    discipline: "Biochemistry",
    panel: "VBG + ketones",
    received: "12:46",
    stage: "released",
    analyser: "POCT gas · ED-1",
    tatMin: 9,
    slaMin: 20,
  },
  {
    accession: "ACC-2026-04399",
    reqId: "REQ-77398",
    patient: "Priya Nair",
    discipline: "Haematology",
    panel: "FBC + ESR",
    received: "12:20",
    stage: "rejected",
    analyser: "Sysmex XN · HM-1",
    tatMin: 96,
    slaMin: 60,
    rejectReason: "Clotted EDTA sample — recollection requested",
  },
  {
    accession: "ACC-2026-04390",
    reqId: "REQ-77372",
    patient: "Ibrahim Sayed",
    discipline: "Histopathology",
    panel: "Bone marrow trephine",
    received: "09:10",
    stage: "on-analyser",
    analyser: "Processor · HP-1",
    tatMin: 290,
    slaMin: 2880,
  },
];

export type ResultLine = {
  analyte: string;
  value: string;
  unit: string;
  ref: string;
  flag: "normal" | "high" | "low" | "critical";
  delta: string;
};

export const pendingValidation: {
  accession: string;
  patient: string;
  panel: string;
  analyser: string;
  lines: ResultLine[];
}[] = [
  {
    accession: "ACC-2026-04407",
    patient: "Daniel Osei",
    panel: "U&E + Mg + BNP",
    analyser: "Cobas 8000 · CH-2",
    lines: [
      { analyte: "Sodium", value: "134", unit: "mmol/L", ref: "135–145", flag: "low", delta: "−2" },
      { analyte: "Potassium", value: "5.9", unit: "mmol/L", ref: "3.5–5.1", flag: "critical", delta: "+0.7" },
      { analyte: "Urea", value: "11.2", unit: "mmol/L", ref: "2.5–7.8", flag: "high", delta: "+1.4" },
      { analyte: "Creatinine", value: "148", unit: "µmol/L", ref: "60–110", flag: "high", delta: "+12" },
      { analyte: "Magnesium", value: "0.82", unit: "mmol/L", ref: "0.70–1.00", flag: "normal", delta: "0" },
      { analyte: "BNP", value: "1840", unit: "pg/mL", ref: "< 100", flag: "high", delta: "+310" },
    ],
  },
  {
    accession: "ACC-2026-04411",
    patient: "Rahul Menon",
    panel: "Lactate + CRP",
    analyser: "Cobas 8000 · CH-1",
    lines: [
      { analyte: "Lactate", value: "3.6", unit: "mmol/L", ref: "0.5–2.2", flag: "critical", delta: "+0.5" },
      { analyte: "CRP", value: "214", unit: "mg/L", ref: "< 5", flag: "high", delta: "+96" },
    ],
  },
];

export type Analyser = {
  id: string;
  name: string;
  discipline: string;
  state: "running" | "idle" | "qc-due" | "fault";
  queue: number;
  throughput: string;
  qcLastPass: string;
  uptime: string;
};

export const analysers: Analyser[] = [
  {
    id: "CH-1",
    name: "Roche Cobas 8000",
    discipline: "Biochemistry",
    state: "running",
    queue: 42,
    throughput: "1,800 tests/hr",
    qcLastPass: "Today 06:12 · all levels",
    uptime: "99.6%",
  },
  {
    id: "HM-1",
    name: "Sysmex XN-1000",
    discipline: "Haematology",
    state: "qc-due",
    queue: 17,
    throughput: "100 samples/hr",
    qcLastPass: "Yesterday 22:40",
    uptime: "98.9%",
  },
  {
    id: "MB-2",
    name: "BacT/ALERT VIRTUO",
    discipline: "Microbiology",
    state: "running",
    queue: 88,
    throughput: "continuous",
    qcLastPass: "Today 05:00",
    uptime: "99.9%",
  },
  {
    id: "IM-1",
    name: "Architect i2000",
    discipline: "Immunology",
    state: "fault",
    queue: 6,
    throughput: "—",
    qcLastPass: "Today 06:20",
    uptime: "94.2%",
  },
];

export type CriticalValue = {
  accession: string;
  patient: string;
  location: string;
  analyte: string;
  value: string;
  detected: string;
  calledTo?: string;
  calledAt?: string;
  readBack: boolean;
};

export const criticalValues: CriticalValue[] = [
  {
    accession: "ACC-2026-04411",
    patient: "Rahul Menon",
    location: "W3-06",
    analyte: "Lactate",
    value: "3.6 mmol/L",
    detected: "14:04",
    readBack: false,
  },
  {
    accession: "ACC-2026-04407",
    patient: "Daniel Osei",
    location: "W3-11",
    analyte: "Potassium",
    value: "5.9 mmol/L",
    detected: "13:58",
    readBack: false,
  },
  {
    accession: "ACC-2026-04381",
    patient: "M. Bhatt",
    location: "ICU-3",
    analyte: "Troponin T",
    value: "1,240 ng/L",
    detected: "11:12",
    calledTo: "Dr. K. Sharma",
    calledAt: "11:16",
    readBack: true,
  },
];

export const labStats = [
  { label: "Samples in lab", value: "128", note: "6 stat" },
  { label: "Awaiting validation", value: "2 panels", note: "2 critical flags" },
  { label: "TAT within SLA", value: "94.1%", note: "target 92%" },
  { label: "Rejected today", value: "3", note: "2 clotted · 1 unlabelled" },
];
