import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import {
  getAppointments,
  saveConsultation,
  orderDiagnostic,
  getPatientHistory,
  getDoctorProfile,
  updateDoctorProfile,
  getDashboardStats,
  getAssignedPatients,
  getDiagnosticResults,
  getOrdersAndMeds,
  getClinicalNotes,
  createClinicalNote,
  getHandovers,
  createHandover,
  getSchedule,
} from "../controllers/doctor.controller.js";
import { UserRole } from "../models/user.model.js";
import multer from "multer";

const upload = multer({ dest: "uploads/" });

const router = Router();

// Only DOCTOR can access these routes
router.use(verifyToken);
router.use(requireRole([UserRole.DOCTOR]));

router.get("/appointments", getAppointments);
router.post("/consultations", saveConsultation);
router.post("/diagnostic-orders", orderDiagnostic);
router.get("/patients/:id/history", getPatientHistory);
router.get("/profile", getDoctorProfile);
router.put("/profile", upload.single("avatar"), updateDoctorProfile);

// New audit endpoints
router.get("/dashboard-stats", getDashboardStats);
router.get("/patients", getAssignedPatients);
router.get("/diagnostic-reports", getDiagnosticResults);
router.get("/orders-and-meds", getOrdersAndMeds);

// Notes & Handovers
router.get("/clinical-notes", getClinicalNotes);
router.post("/clinical-notes", createClinicalNote);
router.get("/handovers", getHandovers);
router.post("/handovers", createHandover);

// Schedule
router.get("/schedule", getSchedule);

export default router;
