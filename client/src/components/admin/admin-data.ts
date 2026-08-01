// Mock console data. Frontend-only fixtures for the admin console.

export type Approval = {
  id: string;
  name: string;
  role: string;
  dept: string;
  submitted: string;
  license: string;
  status: "pending" | "review";
};

export const approvals: Approval[] = [
  {
    id: "REQ-4411",
    name: "Dr. Anaya Kulkarni",
    role: "Consultant · Cardiology",
    dept: "Cardiology",
    submitted: "12m ago",
    license: "MCI-88214-K",
    status: "pending",
  },
  {
    id: "REQ-4410",
    name: "Dr. Samuel Oyelaran",
    role: "Registrar · Radiology",
    dept: "Radiology",
    submitted: "48m ago",
    license: "MCI-77031-R",
    status: "review",
  },
  {
    id: "REQ-4408",
    name: "Nurse Wei Lin",
    role: "Charge nurse · ICU",
    dept: "Critical care",
    submitted: "2h ago",
    license: "RN-20551-C",
    status: "pending",
  },
  {
    id: "REQ-4405",
    name: "Dr. Priya Menon",
    role: "Anesthetist · Theatre 3",
    dept: "Surgery",
    submitted: "5h ago",
    license: "MCI-64019-A",
    status: "review",
  },
];

export type StaffRow = {
  id: string;
  name: string;
  role: string;
  dept: string;
  access: "Full" | "Clinical" | "Read-only" | "Billing";
  state: "Active" | "Suspended" | "On leave";
  load: number;
};

export const staff: StaffRow[] = [
  { id: "EMP-0142", name: "Dr. Ravi Deshmukh", role: "Chief of medicine", dept: "Medicine", access: "Full", state: "Active", load: 72 },
  { id: "EMP-0187", name: "Dr. Hana Sato", role: "Consultant", dept: "Neurology", access: "Clinical", state: "Active", load: 88 },
  { id: "EMP-0233", name: "Marcus Bell", role: "Revenue lead", dept: "Finance", access: "Billing", state: "Active", load: 41 },
  { id: "EMP-0301", name: "Dr. Ines Ferreira", role: "Registrar", dept: "Radiology", access: "Clinical", state: "On leave", load: 0 },
  { id: "EMP-0344", name: "Tomas Nyberg", role: "Records officer", dept: "HIM", access: "Read-only", state: "Suspended", load: 0 },
  { id: "EMP-0399", name: "Dr. Leila Haddad", role: "Consultant", dept: "Obstetrics", access: "Clinical", state: "Active", load: 64 },
];

export type Ward = { name: string; total: number; used: number; code: string };

export const wards: Ward[] = [
  { name: "Intensive care", code: "ICU-A", total: 24, used: 21 },
  { name: "General medicine", code: "GEN-2", total: 60, used: 44 },
  { name: "Surgical recovery", code: "SUR-1", total: 32, used: 27 },
  { name: "Maternity", code: "MAT-3", total: 28, used: 15 },
  { name: "Paediatrics", code: "PED-1", total: 20, used: 12 },
  { name: "Isolation", code: "ISO-B", total: 12, used: 9 },
];

export type AuditEntry = { at: string; actor: string; action: string; target: string; level: "info" | "warn" | "crit" };

export const audit: AuditEntry[] = [
  { at: "07:14:02", actor: "admin@healos", action: "Elevated access granted", target: "EMP-0187", level: "warn" },
  { at: "07:02:55", actor: "system", action: "Nightly ledger reconciled", target: "BILL-2026-07", level: "info" },
  { at: "06:51:19", actor: "r.deshmukh", action: "Discharge summary signed", target: "PT-99401", level: "info" },
  { at: "06:33:07", actor: "security", action: "Failed login × 5 — IP blocked", target: "203.0.113.44", level: "crit" },
  { at: "06:12:44", actor: "admin@healos", action: "Role revoked", target: "EMP-0344", level: "warn" },
  { at: "05:58:10", actor: "i.ferreira", action: "Radiology report published", target: "SCAN-7712", level: "info" },
];

export type Invoice = { id: string; patient: string; payer: string; amount: number; state: "Paid" | "Pending" | "Disputed" };

export const invoices: Invoice[] = [
  { id: "INV-77120", patient: "PT-99401", payer: "Aetna", amount: 8420, state: "Pending" },
  { id: "INV-77118", patient: "PT-99388", payer: "Self-pay", amount: 1290, state: "Paid" },
  { id: "INV-77111", patient: "PT-99341", payer: "NHS Trust", amount: 15380, state: "Disputed" },
  { id: "INV-77104", patient: "PT-99310", payer: "Bupa", amount: 4670, state: "Paid" },
  { id: "INV-77098", patient: "PT-99287", payer: "Aetna", amount: 9910, state: "Pending" },
];

export type Supply = { item: string; code: string; stock: number; reorder: number; unit: string };

export const supplies: Supply[] = [
  { item: "Propofol 20ml", code: "PH-2201", stock: 42, reorder: 60, unit: "vials" },
  { item: "Blood units O−", code: "BB-0O-N", stock: 9, reorder: 15, unit: "units" },
  { item: "Surgical gowns L", code: "CS-5540", stock: 310, reorder: 150, unit: "pcs" },
  { item: "Contrast iodine", code: "RD-1180", stock: 18, reorder: 25, unit: "bottles" },
  { item: "Insulin glargine", code: "PH-3390", stock: 128, reorder: 80, unit: "pens" },
];

export const throughput = [42, 55, 48, 63, 71, 66, 78, 84, 76, 91, 88, 96, 90, 103];
