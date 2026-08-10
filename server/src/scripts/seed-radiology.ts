import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { User } from "../models/user.model.js";
import {
  DiagnosticOrder,
  DiagnosticReport,
  ModalityMachine,
  CriticalFinding,
  RadiologyBooking,
  ReportTemplate,
} from "../models/index.js";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), "..", ".env") });

const seedRadiology = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Ensure we have some test users
    let doctor = await User.findOne({ role: "DOCTOR" });
    let patient = await User.findOne({ role: "PATIENT" });
    let radiologist = await User.findOne({ role: "RADIOLOGIST" });

    if (!doctor) {
      doctor = await User.create({ email: "doc_rad@healos.com", password: "password123", name: "Dr. Bose (ED)", role: "DOCTOR" });
    }
    if (!patient) {
      patient = await User.create({ email: "pat_rad@healos.com", password: "password123", name: "Arjun Mehta", role: "PATIENT", dateOfBirth: "1965-01-01", gender: "Male" });
    }
    if (!radiologist) {
      radiologist = await User.create({ email: "rad@healos.com", password: "password123", name: "Dr. Iyer (Rad)", role: "RADIOLOGIST" });
    }

    // 1. Wipe existing radiology data
    console.log("Wiping existing radiology data...");
    await DiagnosticOrder.deleteMany({ testType: "RADIOLOGY" });
    await DiagnosticReport.deleteMany({});
    await ModalityMachine.deleteMany({});
    await CriticalFinding.deleteMany({});
    await RadiologyBooking.deleteMany({});
    await ReportTemplate.deleteMany({});

    console.log("Seeding new radiology data...");

    // 2. Seed Modality Machines
    const modalities = [
      { room: "CT-1", modality: "CT", state: "scanning", vendor: "Somatom 128", queue: 4, uptime: "99.4%", doseIndex: "CTDI 41 mGy", nextService: "12 Aug" },
      { room: "MR-2", modality: "MRI", state: "scanning", vendor: "Signa 1.5T", queue: 6, uptime: "97.8%", doseIndex: "n/a", nextService: "02 Sep" },
      { room: "XR-3", modality: "X-Ray", state: "idle", vendor: "DR-F 500", queue: 1, uptime: "99.9%", doseIndex: "DAP 1.2 Gy·cm²", nextService: "28 Aug" },
      { room: "MG-1", modality: "Mammo", state: "maintenance", vendor: "Selenia 3D", queue: 0, uptime: "94.1%", doseIndex: "AGD 1.6 mGy", nextService: "today 14:00" },
      { room: "PET-1", modality: "PET-CT", state: "idle", vendor: "Discovery MI", queue: 2, uptime: "98.2%", doseIndex: "FDG 205 MBq", nextService: "19 Aug" },
      { room: "US-2", modality: "US", state: "offline", vendor: "Affiniti 70", queue: 0, uptime: "88.0%", doseIndex: "n/a", nextService: "probe swap" },
    ];
    await ModalityMachine.insertMany(modalities);

    // 3. Seed Critical Findings
    const criticalFindings = [
      { accession: "ACC-38214", patientName: "Arjun Mehta", finding: "Suspected acute SDH — awaiting neurosurgical callback", called: false, clinician: "Dr. Bose (ED)", atTime: "07:26" },
      { accession: "ACC-38191", patientName: "Vikram Salvi", finding: "Large right pneumothorax", called: true, clinician: "Dr. Kaur (ICU)", atTime: "06:12" },
      { accession: "ACC-38177", patientName: "Asha Rane", finding: "Pulmonary embolism, main pulmonary artery", called: true, clinician: "Dr. Menon (Med)", atTime: "05:48" },
    ];
    await CriticalFinding.insertMany(criticalFindings);

    // 4. Seed Radiology Bookings
    const bookings = [
      { time: "08:00", room: "CT-1", patientName: "R. Bhosale", study: "CT abdomen triphasic", state: "booked" },
      { time: "08:30", room: "CT-1", patientName: "—", study: "open slot", state: "open" },
      { time: "08:30", room: "MR-2", patientName: "P. Deshpande", study: "MRI brain + contrast", state: "booked" },
      { time: "09:00", room: "MG-1", patientName: "S. Warrier", study: "Diagnostic mammography", state: "blocked" },
      { time: "09:15", room: "US-2", patientName: "N. Fernandes", study: "Obstetric growth scan", state: "booked" },
      { time: "09:45", room: "XR-3", patientName: "—", study: "open slot", state: "open" },
    ];
    await RadiologyBooking.insertMany(bookings);

    // 5. Seed Report Templates
    const templates = [
      { label: "CT head non-contrast", body: "TECHNIQUE\nAxial non-contrast CT of the brain, 5 mm reconstructions.\n\nCOMPARISON\nNone available.\n\nFINDINGS\nNo intracranial haemorrhage. Grey-white differentiation preserved.\nVentricles and sulci normal for age. No mass effect or midline shift.\nParanasal sinuses and mastoids clear.\n\nIMPRESSION\n1. No acute intracranial abnormality." },
      { label: "Chest radiograph", body: "TECHNIQUE\nPA erect chest radiograph.\n\nFINDINGS\nLungs clear, no consolidation or effusion.\nCardiomediastinal contours within normal limits.\nNo pneumothorax. Bones and soft tissues unremarkable.\n\nIMPRESSION\n1. Normal chest radiograph." },
      { label: "MRI lumbar spine", body: "TECHNIQUE\nMultiplanar multisequence MRI of the lumbar spine without contrast.\n\nFINDINGS\nVertebral alignment preserved. Disc desiccation at L4-L5.\nNo canal stenosis. Conus terminates at L1.\n\nIMPRESSION\n1. Mild degenerative disc disease at L4-L5." },
      { label: "USG abdomen + pelvis", body: "TECHNIQUE\nGrey-scale and colour Doppler sonography of the abdomen and pelvis.\n\nFINDINGS\nLiver normal in size and echotexture. No biliary dilatation.\nKidneys normal, no hydronephrosis. No free fluid.\n\nIMPRESSION\n1. Unremarkable abdominal ultrasound." },
    ];
    await ReportTemplate.insertMany(templates);

    // 6. Seed Diagnostic Orders (Worklist)
    const worklist = [
      { accessionNumber: "ACC-38214", testName: "CT head non-contrast", modality: "CT", room: "CT-1", priority: "STAT", status: "IN_PROGRESS", tatMin: 21, slaMin: 30, radiologist: "Dr. Iyer" },
      { accessionNumber: "ACC-38215", testName: "MRI lumbar spine", modality: "MRI", room: "MR-2", priority: "ROUTINE", status: "PENDING", tatMin: 9, slaMin: 240, radiologist: "—" },
      { accessionNumber: "ACC-38216", testName: "Chest PA erect", modality: "X-Ray", room: "XR-3", priority: "URGENT", status: "PENDING", tatMin: 6, slaMin: 60, radiologist: "unassigned" },
      { accessionNumber: "ACC-38217", testName: "Bilateral screening mammography", modality: "Mammo", room: "MG-1", priority: "ROUTINE", status: "REPORTED", tatMin: 74, slaMin: 480, radiologist: "Dr. Nair" },
      { accessionNumber: "ACC-38218", testName: "FDG PET-CT staging", modality: "PET-CT", room: "PET-1", priority: "URGENT", status: "REPORTED", tatMin: 132, slaMin: 180, radiologist: "Dr. Iyer" },
      { accessionNumber: "ACC-38219", testName: "USG abdomen + pelvis", modality: "US", room: "US-2", priority: "ROUTINE", status: "PENDING", tatMin: 0, slaMin: 240, radiologist: "—" },
    ];

    for (const w of worklist) {
      const order = await DiagnosticOrder.create({
        patient: patient._id,
        doctor: doctor._id,
        testType: "RADIOLOGY",
        testName: w.testName,
        priority: w.priority,
        status: w.status,
        accessionNumber: w.accessionNumber,
        modality: w.modality,
        room: w.room,
        tatMin: w.tatMin,
        slaMin: w.slaMin,
        radiologist: w.radiologist,
      });

      // 7. Seed Diagnostic Reports (Documents) linked to Orders
      if (w.accessionNumber === "ACC-38217") {
        await DiagnosticReport.create({
          order: order._id, patient: patient._id, radiologist: radiologist?._id || doctor._id,
          uploadedBy: "Dr. Nair", kind: "PDF report", fileName: "mammo-screening-report.pdf",
          fileSize: "412 KB", pages: 3, state: "pending sign", findings: "—"
        });
      } else if (w.accessionNumber === "ACC-38218") {
        await DiagnosticReport.create({
          order: order._id, patient: patient._id, radiologist: radiologist?._id || doctor._id,
          uploadedBy: "Dr. Iyer", kind: "PDF report", fileName: "pet-ct-staging-final.pdf",
          fileSize: "1.8 MB", pages: 6, state: "verified", findings: "—"
        });
      } else if (w.accessionNumber === "ACC-38216") {
        await DiagnosticReport.create({
          order: order._id, patient: patient._id, radiologist: radiologist?._id || doctor._id,
          uploadedBy: "ED clerk", kind: "Scanned request", fileName: "ed-request-form-scan.pdf",
          fileSize: "220 KB", pages: 1, state: "verified", findings: "—"
        });
      } else if (w.accessionNumber === "ACC-38214") {
        await DiagnosticReport.create({
          order: order._id, patient: patient._id, radiologist: radiologist?._id || doctor._id,
          uploadedBy: "CT-1 modality", kind: "DICOM series", fileName: "CT-HEAD-AX-5mm.zip",
          fileSize: "84 MB", pages: 0, state: "verified", findings: "—"
        });
      } else if (w.accessionNumber === "ACC-38215") {
        await DiagnosticReport.create({
          order: order._id, patient: patient._id, radiologist: radiologist?._id || doctor._id,
          uploadedBy: "Front desk", kind: "Prior report", fileName: "outside-mri-2024-report.pdf",
          fileSize: "96 KB", pages: 2, state: "quarantined", findings: "—"
        });
      }
    }

    console.log("✅ Radiology seed completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedRadiology();
