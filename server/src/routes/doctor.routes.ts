import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import {
  getAppointments,
  saveConsultation,
  orderDiagnostic,
  getPatientHistory,
} from "../controllers/doctor.controller.js";
import { UserRole } from "../models/user.model.js";

const router = Router();

// Only DOCTOR and ADMIN can access these routes
router.use(verifyToken);
router.use(requireRole([UserRole.DOCTOR, UserRole.ADMIN]));

router.get("/appointments", getAppointments);
router.post("/consultations", saveConsultation);
router.post("/diagnostic-orders", orderDiagnostic);
router.get("/patients/:id/history", getPatientHistory);

export default router;
