import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { UserRole } from "../models/user.model.js";
import {
  getVitalsQueue,
  recordVitals,
  getPatientVitals,
  getFluidBalances,
  getCallBells,
  getMarDoses,
  getWounds,
  getHandovers,
} from "../controllers/nurse.controller.js";

const router = express.Router();

router.use(verifyToken);
router.use(requireRole([UserRole.NURSE, UserRole.ADMIN, UserRole.DOCTOR]));

router.get("/queue", getVitalsQueue);
router.post("/vitals", recordVitals);
router.get("/vitals/:patientId", getPatientVitals);

router.get("/fluids", getFluidBalances);
router.get("/call-bells", getCallBells);
router.get("/emar", getMarDoses);
router.get("/wounds", getWounds);
router.get("/handovers", getHandovers);

export default router;
