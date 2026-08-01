import { Router } from "express";
import { 
  applyForRole, 
  getMyStatus,
  updatePatientProfile,
  getPatientProfile,
  getPendingRequests, 
  approveRequest, 
  rejectRequest 
} from "../controllers/onboarding.controller";
import { verifyToken, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models";

const router = Router();

// ==========================================
// User Routes (Patient & Clinician Application)
// ==========================================
router.put("/patient-profile", verifyToken, updatePatientProfile);
router.get("/patient-profile", verifyToken, getPatientProfile);

router.post("/apply", verifyToken, applyForRole);
router.get("/my-status", verifyToken, getMyStatus);

// ==========================================
// Admin Routes
// ==========================================
router.use(verifyToken, requireRole([UserRole.ADMIN]));

router.get("/requests", getPendingRequests);
router.put("/:id/approve", approveRequest);
router.put("/:id/reject", rejectRequest);

export default router;
