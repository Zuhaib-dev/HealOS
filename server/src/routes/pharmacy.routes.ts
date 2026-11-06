import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { UserRole } from "../models/user.model.js";
import {
  getPendingPrescriptions,
  createPharmacyBill,
  getPrescriptionHistory,
  getPharmacyCatalog,
  recordPharmacyCashPayment,
  dispensePharmacySale,
} from "../controllers/pharmacy.controller.js";

const router = express.Router();

router.use(verifyToken);
router.use(requireRole([UserRole.PHARMACIST]));

router.get("/prescriptions/pending", getPendingPrescriptions);
router.get("/prescriptions/history", getPrescriptionHistory);
router.get("/catalog", getPharmacyCatalog);
router.post("/prescriptions/:consultationId/bill", createPharmacyBill);
router.post("/sales/:saleId/cash", recordPharmacyCashPayment);
router.post("/sales/:saleId/dispense", dispensePharmacySale);

export default router;
