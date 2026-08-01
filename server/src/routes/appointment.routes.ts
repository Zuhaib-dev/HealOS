import { Router } from "express";
import {
  bookAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
  getAvailableDoctors,
} from "../controllers/appointment.controller";
import { verifyToken, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models";

const router = Router();

// Public / Authenticated Doctor List for selection
router.get("/doctors-list", verifyToken, getAvailableDoctors);

// Patient routes
router.post("/book", verifyToken, bookAppointment);
router.get("/patient", verifyToken, getPatientAppointments);

// Doctor & Admin routes
router.get("/doctor", verifyToken, requireRole([UserRole.DOCTOR, UserRole.RADIOLOGIST, UserRole.ADMIN]), getDoctorAppointments);
router.put("/:id/status", verifyToken, updateAppointmentStatus);

export default router;
