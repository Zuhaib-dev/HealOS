import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { UserRole } from "../models/user.model.js";
import {
  getVitalsQueue,
  recordVitals,
  getPatientVitals,
} from "../controllers/nurse.controller.js";

const router = express.Router();

router.use(verifyToken);
router.use(requireRole([UserRole.NURSE, UserRole.ADMIN]));

router.get("/queue", getVitalsQueue);
router.post("/vitals", recordVitals);
router.get("/vitals/:patientId", getPatientVitals);

export default router;
