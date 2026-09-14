import express from "express";
import { getSystemHealth } from "../controllers/system.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { UserRole } from "../models/user.model.js";

const router = express.Router();

router.use(verifyToken);
router.use(requireRole([UserRole.ADMIN]));

router.get("/health", getSystemHealth);

export default router;
