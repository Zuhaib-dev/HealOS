import mongoose from "mongoose";
import { envConfig as env } from "../config/env.js";
import { Ward } from "../models/ward.model.js";
import { Inventory } from "../models/inventory.model.js";
import { AuditLog } from "../models/audit-log.model.js";
import { Integration } from "../models/integration.model.js";

const wards = [
  { name: "Intensive care", code: "ICU-A", capacity: 24, currentOccupancy: 21, department: "Critical Care" },
  { name: "General medicine", code: "GEN-2", capacity: 60, currentOccupancy: 44, department: "Internal Medicine" },
  { name: "Surgical recovery", code: "SUR-1", capacity: 32, currentOccupancy: 27, department: "Surgery" },
  { name: "Maternity", code: "MAT-3", capacity: 28, currentOccupancy: 15, department: "Obstetrics" },
  { name: "Paediatrics", code: "PED-1", capacity: 20, currentOccupancy: 12, department: "Paediatrics" },
  { name: "Isolation", code: "ISO-B", capacity: 12, currentOccupancy: 9, department: "Infectious Diseases" },
];

const supplies = [
  { itemName: "Propofol 20ml", itemCode: "PH-2201", currentStock: 42, reorderThreshold: 60, unit: "vials", category: "Pharmacy" },
  { itemName: "Blood units O−", itemCode: "BB-0O-N", currentStock: 9, reorderThreshold: 15, unit: "units", category: "Blood Bank" },
  { itemName: "Surgical gowns L", itemCode: "CS-5540", currentStock: 310, reorderThreshold: 150, unit: "pcs", category: "Central Supply" },
  { itemName: "Contrast iodine", itemCode: "RD-1180", currentStock: 18, reorderThreshold: 25, unit: "bottles", category: "Radiology" },
  { itemName: "Insulin glargine", itemCode: "PH-3390", currentStock: 128, reorderThreshold: 80, unit: "pens", category: "Pharmacy" },
];

const auditLogs = [
  { actor: "admin@healos", action: "Elevated access granted", target: "EMP-0187", level: "warn" as const, timestamp: new Date(Date.now() - 1000 * 60 * 120) },
  { actor: "system", action: "Nightly ledger reconciled", target: "BILL-2026-07", level: "info" as const, timestamp: new Date(Date.now() - 1000 * 60 * 180) },
  { actor: "r.deshmukh", action: "Discharge summary signed", target: "PT-99401", level: "info" as const, timestamp: new Date(Date.now() - 1000 * 60 * 200) },
  { actor: "security", action: "Failed login × 5 — IP blocked", target: "203.0.113.44", level: "crit" as const, timestamp: new Date(Date.now() - 1000 * 60 * 250) },
  { actor: "admin@healos", action: "Role revoked", target: "EMP-0344", level: "warn" as const, timestamp: new Date(Date.now() - 1000 * 60 * 300) },
  { actor: "i.ferreira", action: "Radiology report published", target: "SCAN-7712", level: "info" as const, timestamp: new Date(Date.now() - 1000 * 60 * 350) },
];

const integrations = [
  { type: "SERVICE", name: "HL7 / FHIR bridge", category: "Interop", status: "connected", detail: "1.2M messages · 0 rejects (24h)" },
  { type: "SERVICE", name: "PACS radiology store", category: "Imaging", status: "connected", detail: "Latency 84ms · 12.4TB used" },
  { type: "SERVICE", name: "Lab analyser gateway", category: "Diagnostics", status: "degraded", detail: "2 analysers offline · retrying" },
  { type: "SERVICE", name: "Claims clearinghouse", category: "Revenue", status: "connected", detail: "97.4% first-pass acceptance" },
  { type: "SERVICE", name: "SMS / patient reminders", category: "Comms", status: "connected", detail: "4,118 sent today" },
  { type: "SERVICE", name: "e-Prescription network", category: "Pharmacy", status: "off", detail: "Awaiting regulator sign-off" },
  { type: "API_KEY", name: "Mobile app (prod)", keyPrefix: "hos_live_9f2a", scope: "records:read orders:write", lastUsed: new Date(Date.now() - 1000 * 42) },
  { type: "API_KEY", name: "Billing sync", keyPrefix: "hos_live_41cd", scope: "billing:*", lastUsed: new Date(Date.now() - 1000 * 60 * 11) },
  { type: "API_KEY", name: "Analytics warehouse", keyPrefix: "hos_ro_7b03", scope: "read-only", lastUsed: new Date(Date.now() - 1000 * 60 * 60) },
];

async function seed() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Connected to MongoDB");

    await Ward.deleteMany({});
    await Inventory.deleteMany({});
    await AuditLog.deleteMany({});
    await Integration.deleteMany({});

    await Ward.insertMany(wards);
    console.log("Wards seeded");

    await Inventory.insertMany(supplies);
    console.log("Inventory seeded");

    await AuditLog.insertMany(auditLogs);
    console.log("AuditLogs seeded");

    await Integration.insertMany(integrations);
    console.log("Integrations seeded");

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding DB:", error);
    process.exit(1);
  }
}

seed();
