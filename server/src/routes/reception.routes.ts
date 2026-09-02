import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { UserRole } from "../models/user.model.js";
import {
  registerPatientAndCreateToken,
  getQueue,
  getPendingBills,
  payBill,
  getReceptionOverview,
} from "../controllers/reception.controller.js";

const router = Router();

router.use(verifyToken);
router.use(requireRole([UserRole.RECEPTIONIST, UserRole.ADMIN]));

router.get("/overview", getReceptionOverview);
router.get("/stats", getReceptionOverview);
router.post("/register", registerPatientAndCreateToken);
router.get("/queue", getQueue);
router.get("/bills/pending", getPendingBills);
router.put("/bills/:id/pay", payBill);

export default router;
