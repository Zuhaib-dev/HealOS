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
import { authRateLimiter, otpRateLimiter } from "../middleware/rate-limit";

const router = Router();

// Public routes
router.post("/sync", authRateLimiter, syncGoogleUser);
router.post("/register", authRateLimiter, otpRateLimiter, register);
router.post("/verify-otp", authRateLimiter, verifyOtp);
router.post("/resend-otp", authRateLimiter, otpRateLimiter, resendOtp);
router.post("/login", authRateLimiter, login);

// Protected routes (Requires valid JWT)
router.get("/me", verifyToken, getMe);
router.put("/phone", verifyToken, updatePhone);

export default router;
