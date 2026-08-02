import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { getPatientDashboard } from "../controllers/patient.controller.js";
import { UserRole } from "../models/user.model.js";

const router = Router();

router.use(verifyToken);
router.use(requireRole([UserRole.PATIENT]));

router.get("/dashboard", getPatientDashboard);

export default router;
