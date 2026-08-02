import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { getOrders, updateOrderStatus, uploadReport, upload } from "../controllers/radiology.controller.js";
import { UserRole } from "../models/user.model.js";

const router = Router();

router.use(verifyToken);
// Assuming RADIOLOGIST acts as the general lab worker role as discussed
router.use(requireRole([UserRole.RADIOLOGIST]));

router.get("/orders", getOrders);
router.put("/orders/:id/status", updateOrderStatus);
router.post("/orders/:id/report", upload.single("reportFile"), uploadReport);

export default router;
