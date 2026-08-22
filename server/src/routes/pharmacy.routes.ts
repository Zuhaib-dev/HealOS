import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { UserRole } from "../models/user.model.js";
import {
  getPendingPrescriptions,
  dispenseMedicine,
  createPharmacyBill,
} from "../controllers/pharmacy.controller.js";

const router = express.Router();

router.use(verifyToken);
router.use(requireRole([UserRole.PHARMACIST, UserRole.ADMIN]));

router.get("/prescriptions/pending", getPendingPrescriptions);
router.patch("/prescriptions/:consultationId/dispense", dispenseMedicine);
router.post("/prescriptions/:consultationId/bill", createPharmacyBill);

export default router;
