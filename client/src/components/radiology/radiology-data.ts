/* Mock fixtures for the HealOS imaging & diagnostics workspace. */

export type Modality = "CT" | "MRI" | "X-Ray" | "US" | "Mammo" | "PET-CT";

export type WorklistItem = {
  accession: string;
  patient: string;
  mrn: string;
  age: number;
  sex: "M" | "F";
  modality: Modality;
  study: string;
  priority: "stat" | "urgent" | "routine";
  status: "scheduled" | "in-room" | "acquired" | "reporting" | "reported" | "verified";
  room: string;
  requested: string;
  tatMin: number;
  slaMin: number;
  radiologist: string;
};

export const worklist: WorklistItem[] = [
  {
    accession: "ACC-38214",
    patient: "Arjun Mehta",
    mrn: "MRN-90441",
    age: 61,
    sex: "M",
    modality: "CT",
    study: "CT head non-contrast",
    priority: "stat",
    status: "reporting",
    room: "CT-1",
    requested: "07:02",
    tatMin: 21,
    slaMin: 30,
    radiologist: "Dr. Iyer",
  },
  {
    accession: "ACC-38215",
    patient: "Sneha Kulkarni",
    mrn: "MRN-88120",
    age: 34,
    sex: "F",
    modality: "MRI",
    study: "MRI lumbar spine",
    priority: "routine",
    status: "in-room",
    room: "MR-2",
    requested: "07:15",
    tatMin: 9,
    slaMin: 240,
    radiologist: "—",
  },
  {
    accession: "ACC-38216",
    patient: "Ramesh Pawar",
    mrn: "MRN-77510",
    age: 72,
    sex: "M",
    modality: "X-Ray",
    study: "Chest PA erect",
    priority: "urgent",
    status: "acquired",
    room: "XR-3",
    requested: "07:21",
    tatMin: 6,
    slaMin: 60,
    radiologist: "unassigned",
  },
  {
    accession: "ACC-38217",
    patient: "Fatima Shaikh",
    mrn: "MRN-65003",
    age: 45,
    sex: "F",
    modality: "Mammo",
    study: "Bilateral screening mammography",
    priority: "routine",
    status: "reported",
    room: "MG-1",
    requested: "06:40",
    tatMin: 74,
    slaMin: 480,
    radiologist: "Dr. Nair",
  },
  {
    accession: "ACC-38218",
    patient: "Daniel Rozario",
    mrn: "MRN-51288",
    age: 58,
    sex: "M",
    modality: "PET-CT",
    study: "FDG PET-CT staging",
    priority: "urgent",
    status: "verified",
    room: "PET-1",
    requested: "05:55",
    tatMin: 132,
    slaMin: 180,
    radiologist: "Dr. Iyer",
  },
  {
    accession: "ACC-38219",
    patient: "Meera Joshi",
    mrn: "MRN-44219",
    age: 29,
    sex: "F",
    modality: "US",
    study: "USG abdomen + pelvis",
    priority: "routine",
    status: "scheduled",
    room: "US-2",
    requested: "08:10",
    tatMin: 0,
    slaMin: 240,
    radiologist: "—",
  },
];

export type StudyDoc = {
  id: string;
  accession: string;
  patient: string;
  kind: "PDF report" | "DICOM series" | "Scanned request" | "Prior report" | "Consent";
  name: string;
  size: string;
  pages: number;
  uploaded: string;
  by: string;
  state: "verified" | "pending sign" | "quarantined";
};

export const documents: StudyDoc[] = [
  {
    id: "d1",
    accession: "ACC-38217",
    patient: "Fatima Shaikh",
    kind: "PDF report",
    name: "mammo-screening-report.pdf",
    size: "412 KB",
    pages: 3,
    uploaded: "07:04",
    by: "Dr. Nair",
    state: "pending sign",
  },
  {
    id: "d2",
    accession: "ACC-38218",
    patient: "Daniel Rozario",
    kind: "PDF report",
    name: "pet-ct-staging-final.pdf",
    size: "1.8 MB",
    pages: 6,
    uploaded: "06:38",
    by: "Dr. Iyer",
    state: "verified",
  },
  {
    id: "d3",
    accession: "ACC-38216",
    patient: "Ramesh Pawar",
    kind: "Scanned request",
    name: "ed-request-form-scan.pdf",
    size: "220 KB",
    pages: 1,
    uploaded: "07:23",
    by: "ED clerk",
    state: "verified",
  },
  {
    id: "d4",
    accession: "ACC-38214",
    patient: "Arjun Mehta",
    kind: "DICOM series",
    name: "CT-HEAD-AX-5mm.zip",
    size: "84 MB",
    pages: 0,
    uploaded: "07:09",
    by: "CT-1 modality",
    state: "verified",
  },
  {
    id: "d5",
    accession: "ACC-38215",
    patient: "Sneha Kulkarni",
    kind: "Prior report",
    name: "outside-mri-2024-report.pdf",
    size: "96 KB",
    pages: 2,
    uploaded: "yesterday",
    by: "Front desk",
    state: "quarantined",
  },
];

export type ReportTemplate = { id: string; label: string; body: string };

export const reportTemplates: ReportTemplate[] = [
  {
    id: "ct-head",
    label: "CT head non-contrast",
    body: `TECHNIQUE\nAxial non-contrast CT of the brain, 5 mm reconstructions.\n\nCOMPARISON\nNone available.\n\nFINDINGS\nNo intracranial haemorrhage. Grey-white differentiation preserved.\nVentricles and sulci normal for age. No mass effect or midline shift.\nParanasal sinuses and mastoids clear.\n\nIMPRESSION\n1. No acute intracranial abnormality.`,
  },
  {
    id: "cxr",
    label: "Chest radiograph",
    body: `TECHNIQUE\nPA erect chest radiograph.\n\nFINDINGS\nLungs clear, no consolidation or effusion.\nCardiomediastinal contours within normal limits.\nNo pneumothorax. Bones and soft tissues unremarkable.\n\nIMPRESSION\n1. Normal chest radiograph.`,
  },
  {
    id: "mri-ls",
    label: "MRI lumbar spine",
    body: `TECHNIQUE\nMultiplanar multisequence MRI of the lumbar spine without contrast.\n\nFINDINGS\nVertebral alignment preserved. Disc desiccation at L4-L5.\nNo canal stenosis. Conus terminates at L1.\n\nIMPRESSION\n1. Mild degenerative disc disease at L4-L5.`,
  },
  {
    id: "usg-abd",
    label: "USG abdomen + pelvis",
    body: `TECHNIQUE\nGrey-scale and colour Doppler sonography of the abdomen and pelvis.\n\nFINDINGS\nLiver normal in size and echotexture. No biliary dilatation.\nKidneys normal, no hydronephrosis. No free fluid.\n\nIMPRESSION\n1. Unremarkable abdominal ultrasound.`,
  },
];

export type ModalityStatus = {
  room: string;
  modality: Modality;
  state: "scanning" | "idle" | "maintenance" | "offline";
  vendor: string;
  queue: number;
  uptime: string;
  doseIndex: string;
  nextService: string;
};

export const modalities: ModalityStatus[] = [
  {
    room: "CT-1",
    modality: "CT",
    state: "scanning",
    vendor: "Somatom 128",
    queue: 4,
    uptime: "99.4%",
    doseIndex: "CTDI 41 mGy",
    nextService: "12 Aug",
  },
  {
    room: "MR-2",
    modality: "MRI",
    state: "scanning",
    vendor: "Signa 1.5T",
    queue: 6,
    uptime: "97.8%",
    doseIndex: "n/a",
    nextService: "02 Sep",
  },
  {
    room: "XR-3",
    modality: "X-Ray",
    state: "idle",
    vendor: "DR-F 500",
    queue: 1,
    uptime: "99.9%",
    doseIndex: "DAP 1.2 Gy·cm²",
    nextService: "28 Aug",
  },
  {
    room: "MG-1",
    modality: "Mammo",
    state: "maintenance",
    vendor: "Selenia 3D",
    queue: 0,
    uptime: "94.1%",
    doseIndex: "AGD 1.6 mGy",
    nextService: "today 14:00",
  },
  {
    room: "PET-1",
    modality: "PET-CT",
    state: "idle",
    vendor: "Discovery MI",
    queue: 2,
    uptime: "98.2%",
    doseIndex: "FDG 205 MBq",
    nextService: "19 Aug",
  },
  {
    room: "US-2",
    modality: "US",
    state: "offline",
    vendor: "Affiniti 70",
    queue: 0,
    uptime: "88.0%",
    doseIndex: "n/a",
    nextService: "probe swap",
  },
];

export type CriticalFinding = {
  accession: string;
  patient: string;
  finding: string;
  called: boolean;
  clinician: string;
  at: string;
};

export const criticalFindings: CriticalFinding[] = [
  {
    accession: "ACC-38214",
    patient: "Arjun Mehta",
    finding: "Suspected acute SDH — awaiting neurosurgical callback",
    called: false,
    clinician: "Dr. Bose (ED)",
    at: "07:26",
  },
  {
    accession: "ACC-38191",
    patient: "Vikram Salvi",
    finding: "Large right pneumothorax",
    called: true,
    clinician: "Dr. Kaur (ICU)",
    at: "06:12",
  },
  {
    accession: "ACC-38177",
    patient: "Asha Rane",
    finding: "Pulmonary embolism, main pulmonary artery",
    called: true,
    clinician: "Dr. Menon (Med)",
    at: "05:48",
  },
];

export const tatStats = [
  { label: "Studies today", value: "142", note: "38 stat · 104 routine" },
  { label: "Median report TAT", value: "24m", note: "stat SLA 30m" },
  { label: "Unreported backlog", value: "17", note: "3 breaching SLA" },
  { label: "Reject / repeat rate", value: "1.8%", note: "target < 3%" },
];

export const bookingSlots = [
  { time: "08:00", room: "CT-1", patient: "R. Bhosale", study: "CT abdomen triphasic", state: "booked" },
  { time: "08:30", room: "CT-1", patient: "—", study: "open slot", state: "open" },
  { time: "08:30", room: "MR-2", patient: "P. Deshpande", study: "MRI brain + contrast", state: "booked" },
  { time: "09:00", room: "MG-1", patient: "S. Warrier", study: "Diagnostic mammography", state: "blocked" },
  { time: "09:15", room: "US-2", patient: "N. Fernandes", study: "Obstetric growth scan", state: "booked" },
  { time: "09:45", room: "XR-3", patient: "—", study: "open slot", state: "open" },
] as const;
