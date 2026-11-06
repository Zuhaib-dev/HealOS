import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import {
  getCollections,
  markCollected,
  getSamples,
  getPendingValidation,
  validateReport,
  getAnalysers,
  getCriticalValues,
  getLabStats,
  createLabBill,
  getLabHistory,
  recordLabCashPayment,
  recordCriticalCallback,
} from "../controllers/lab.controller.js";
import { UserRole } from "../models/user.model.js";

const router = Router();

router.use(verifyToken);
// Assuming LAB_TECH acts as the general lab worker role
router.use(requireRole([UserRole.LAB_TECHNICIAN]));

router.get("/collections", getCollections);
router.patch("/collections/:id/collect", markCollected);
router.post("/collections/:id/bill", createLabBill);
router.post("/collections/:id/cash", recordLabCashPayment);

router.get("/samples", getSamples);
router.get("/validation", getPendingValidation);
router.patch("/validation/:id", validateReport);
router.patch("/critical/:id/callback", recordCriticalCallback);
import { upload } from "../controllers/radiology.controller.js";
import { uploadLabReport } from "../controllers/lab.controller.js";
router.get("/reports/history", getLabHistory);
router.post("/reports/:id/upload", upload.single("file"), uploadLabReport);

router.get("/analysers", getAnalysers);
router.get("/critical", getCriticalValues);
router.get("/stats", getLabStats);

export default router;
