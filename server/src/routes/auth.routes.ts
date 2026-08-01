import { Router } from "express";
import {
  syncGoogleUser,
  register,
  verifyOtp,
  resendOtp,
  login,
  getMe,
  updatePhone,
} from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = Router();

// Public routes
router.post("/sync", syncGoogleUser);
router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);

// Protected routes (Requires valid JWT)
router.get("/me", verifyToken, getMe);
router.put("/phone", verifyToken, updatePhone);

export default router;
