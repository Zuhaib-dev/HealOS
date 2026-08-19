import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { UserRole } from "../models/user.model.js";
import {
  getVitalsQueue,
  recordVitals,
  getPatientVitals,
  getFluidBalances,
  getCallBells,
  resolveCallBell,
  getMarDoses,
  administerMarDose,
  getWounds,
  getHandovers,
  createHandover,
} from "../controllers/nurse.controller.js";

const router = express.Router();

router.use(verifyToken);
router.use(requireRole([UserRole.NURSE, UserRole.ADMIN, UserRole.DOCTOR]));

router.get("/queue", getVitalsQueue);
router.post("/vitals", recordVitals);
router.get("/vitals/:patientId", getPatientVitals);

router.get("/fluids", getFluidBalances);
router.get("/call-bells", getCallBells);
router.patch("/call-bells/:id/resolve", resolveCallBell);
router.get("/emar", getMarDoses);
router.patch("/emar/:id/administer", administerMarDose);
router.get("/wounds", getWounds);
router.get("/handovers", getHandovers);
router.post("/handovers", createHandover);

export default router;
