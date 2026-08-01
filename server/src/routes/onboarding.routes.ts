import { Router } from "express";
import { 
  applyForRole, 
  getPendingRequests, 
  approveRequest, 
  rejectRequest 
} from "../controllers/onboarding.controller";
import { verifyToken, requireRole } from "../middleware/auth.middleware";
import { UserRole } from "../models";

const router = Router();

// ==========================================
// User Routes
// ==========================================
// Any authenticated user can apply to be a doctor/radiologist
router.post("/apply", verifyToken, applyForRole);

// ==========================================
// Admin Routes
// ==========================================
// Only Admins can manage onboarding requests
router.use(verifyToken, requireRole([UserRole.ADMIN]));

router.get("/requests", getPendingRequests);
router.put("/:id/approve", approveRequest);
router.put("/:id/reject", rejectRequest);

export default router;
