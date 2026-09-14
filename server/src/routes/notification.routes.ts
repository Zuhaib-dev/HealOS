import express from "express";
import { broadcastNotification, getBroadcastHistory, getUserNotifications, markAsRead } from "../controllers/notification.controller.js";
import { verifyToken, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// User routes
router.get("/", getUserNotifications);
router.put("/:id/read", markAsRead);

// Admin routes
router.post("/broadcast", restrictTo("ADMIN"), broadcastNotification);
router.get("/history", restrictTo("ADMIN"), getBroadcastHistory);

export default router;
