import express from "express";
import { broadcastNotification, getBroadcastHistory, getUserNotifications, markAsRead } from "../controllers/notification.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// User routes
router.get("/", getUserNotifications);
router.put("/:id/read", markAsRead);

// Admin routes
router.post("/broadcast", requireRole(["ADMIN"]), broadcastNotification);
router.get("/history", requireRole(["ADMIN"]), getBroadcastHistory);

export default router;
