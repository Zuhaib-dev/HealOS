// Mock fixtures for people, sessions, scheduling, roles and integrations.

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  role: string;
  dept: string;
  mfa: boolean;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  online: boolean;
  session: "active" | "idle" | "expired";
};

export const users: UserAccount[] = [
  {
    id: "USR-0001",
    name: "Alessia Marchetti",
    email: "a.marchetti@healos.health",
    role: "Superadmin",
    dept: "Administration",
    mfa: true,
    device: "macOS · Chrome 141",
    ip: "10.4.18.22",
    location: "Admin wing · on-site",
    lastActive: "now",
    online: true,
    session: "active",
  },
  {
    id: "USR-0142",
    name: "Dr. Ravi Deshmukh",
    email: "r.deshmukh@healos.health",
    role: "Chief of medicine",
    dept: "Medicine",
    mfa: true,
    device: "iPad · HealOS Clinic 3.2",
    ip: "10.4.22.71",
    location: "Ward GEN-2 · on-site",
    lastActive: "2m ago",
    online: true,
    session: "active",
  },
  {
    id: "USR-0187",
    name: "Dr. Hana Sato",
    email: "h.sato@healos.health",
    role: "Consultant",
    dept: "Neurology",
    mfa: true,
    device: "Windows · Edge 139",
    ip: "10.4.19.08",
    location: "Neuro OPD · on-site",
    lastActive: "6m ago",
    online: true,
    session: "active",
  },
  {
    id: "USR-0233",
    name: "Marcus Bell",
    email: "m.bell@healos.health",
    role: "Revenue lead",
    dept: "Finance",
    mfa: false,
    device: "Windows · Chrome 140",
    ip: "10.4.31.14",
    location: "Finance office · on-site",
    lastActive: "21m ago",
    online: true,
    session: "idle",
  },
  {
    id: "USR-0301",
    name: "Dr. Ines Ferreira",
    email: "i.ferreira@healos.health",
    role: "Registrar",
    dept: "Radiology",
    mfa: true,
    device: "Android · HealOS Mobile",
    ip: "84.19.220.6",
    location: "Remote · Lisbon PT",
    lastActive: "1h 12m ago",
    online: false,
    session: "idle",
  },
  {
    id: "USR-0344",
    name: "Tomas Nyberg",
    email: "t.nyberg@healos.health",
    role: "Records officer",
    dept: "HIM",
    mfa: false,
    device: "Windows · Firefox 132",
    ip: "203.0.113.44",
    location: "Blocked · unknown network",
    lastActive: "6h ago",
    online: false,
    session: "expired",
  },
  {
    id: "USR-0399",
    name: "Dr. Leila Haddad",
    email: "l.haddad@healos.health",
    role: "Consultant",
    dept: "Obstetrics",
    mfa: true,
    device: "iPhone · HealOS Mobile",
    ip: "10.4.27.55",
    location: "Theatre 2 · on-site",
    lastActive: "9m ago",
    online: true,
    session: "active",
  },
  {
    id: "USR-0412",
    name: "Wei Lin",
    email: "w.lin@healos.health",
    role: "Charge nurse",
    dept: "Critical care",
    mfa: true,
    device: "Ward terminal ICU-A-04",
    ip: "10.4.21.04",
    location: "ICU-A · on-site",
    lastActive: "now",
    online: true,
    session: "active",
  },
];

export type PatientRow = {
  mrn: string;
  name: string;
  age: number;
  sex: "M" | "F";
  ward: string;
  attending: string;
  admitted: string;
  acuity: "critical" | "guarded" | "stable";
  flag?: string;
};

export const patients: PatientRow[] = [
  { mrn: "PT-99401", name: "Jonas Vidal", age: 64, sex: "M", ward: "ICU-A", attending: "Dr. Deshmukh", admitted: "3d", acuity: "critical", flag: "Anticoagulant" },
  { mrn: "PT-99388", name: "Meera Shah", age: 31, sex: "F", ward: "MAT-3", attending: "Dr. Haddad", admitted: "1d", acuity: "stable" },
  { mrn: "PT-99341", name: "Owen Brady", age: 52, sex: "M", ward: "SUR-1", attending: "Dr. Menon", admitted: "5d", acuity: "guarded", flag: "Latex allergy" },
  { mrn: "PT-99310", name: "Aiko Tanaka", age: 78, sex: "F", ward: "GEN-2", attending: "Dr. Sato", admitted: "2d", acuity: "guarded" },
  { mrn: "PT-99287", name: "Luis Ortega", age: 8, sex: "M", ward: "PED-1", attending: "Dr. Kulkarni", admitted: "12h", acuity: "stable" },
  { mrn: "PT-99255", name: "Fatima Nadir", age: 45, sex: "F", ward: "ISO-B", attending: "Dr. Oyelaran", admitted: "6d", acuity: "critical", flag: "Airborne isolation" },
];

export type ScheduleBlock = {
  room: string;
  label: string;
  start: number; // hour, 24h
  end: number;
  surgeon: string;
  state: "in-theatre" | "scheduled" | "delayed";
};

export const schedule: ScheduleBlock[] = [
  { room: "Theatre 1", label: "CABG × 3 graft", start: 7, end: 11, surgeon: "Dr. Deshmukh", state: "in-theatre" },
  { room: "Theatre 1", label: "Hernia repair", start: 12, end: 14, surgeon: "Dr. Menon", state: "scheduled" },
  { room: "Theatre 2", label: "C-section", start: 8, end: 10, surgeon: "Dr. Haddad", state: "in-theatre" },
  { room: "Theatre 2", label: "Laparoscopy", start: 11, end: 13, surgeon: "Dr. Ferreira", state: "delayed" },
  { room: "Theatre 3", label: "Craniotomy", start: 9, end: 15, surgeon: "Dr. Sato", state: "scheduled" },
  { room: "Cath lab", label: "Angioplasty ×2", start: 7, end: 12, surgeon: "Dr. Kulkarni", state: "in-theatre" },
];

export const scheduleWindow = { from: 7, to: 16 };

export type RoleDef = {
  role: string;
  seats: number;
  scopes: Record<string, "full" | "read" | "none">;
};

export const permissionScopes = ["Records", "Orders", "Prescribe", "Billing", "Admin", "Audit"];

export const roleMatrix: RoleDef[] = [
  { role: "Superadmin", seats: 2, scopes: { Records: "full", Orders: "full", Prescribe: "none", Billing: "full", Admin: "full", Audit: "full" } },
  { role: "Consultant", seats: 48, scopes: { Records: "full", Orders: "full", Prescribe: "full", Billing: "read", Admin: "none", Audit: "none" } },
  { role: "Registrar", seats: 71, scopes: { Records: "full", Orders: "full", Prescribe: "full", Billing: "none", Admin: "none", Audit: "none" } },
  { role: "Nurse", seats: 164, scopes: { Records: "read", Orders: "read", Prescribe: "none", Billing: "none", Admin: "none", Audit: "none" } },
  { role: "Records officer", seats: 12, scopes: { Records: "read", Orders: "none", Prescribe: "none", Billing: "none", Admin: "none", Audit: "read" } },
  { role: "Revenue", seats: 9, scopes: { Records: "read", Orders: "none", Prescribe: "none", Billing: "full", Admin: "none", Audit: "read" } },
];

export type Integration = {
  name: string;
  kind: string;
  status: "connected" | "degraded" | "off";
  detail: string;
};

export const integrations: Integration[] = [
  { name: "HL7 / FHIR bridge", kind: "Interop", status: "connected", detail: "1.2M messages · 0 rejects (24h)" },
  { name: "PACS radiology store", kind: "Imaging", status: "connected", detail: "Latency 84ms · 12.4TB used" },
  { name: "Lab analyser gateway", kind: "Diagnostics", status: "degraded", detail: "2 analysers offline · retrying" },
  { name: "Claims clearinghouse", kind: "Revenue", status: "connected", detail: "97.4% first-pass acceptance" },
  { name: "SMS / patient reminders", kind: "Comms", status: "connected", detail: "4,118 sent today" },
  { name: "e-Prescription network", kind: "Pharmacy", status: "off", detail: "Awaiting regulator sign-off" },
];

export type ApiKey = { label: string; prefix: string; scope: string; lastUsed: string };

export const apiKeys: ApiKey[] = [
  { label: "Mobile app (prod)", prefix: "hos_live_9f2a", scope: "records:read orders:write", lastUsed: "42s ago" },
  { label: "Billing sync", prefix: "hos_live_41cd", scope: "billing:*", lastUsed: "11m ago" },
  { label: "Analytics warehouse", prefix: "hos_ro_7b03", scope: "read-only", lastUsed: "1h ago" },
];
