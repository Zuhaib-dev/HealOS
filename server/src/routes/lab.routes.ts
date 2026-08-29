import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { getCollections, markCollected, getSamples, getPendingValidation, validateReport, getAnalysers, getCriticalValues, getLabStats, createLabBill, getLabHistory } from "../controllers/lab.controller.js";
import { UserRole } from "../models/user.model.js";

const router = Router();

router.use(verifyToken);
// Assuming LAB_TECH acts as the general lab worker role
router.use(requireRole([UserRole.LAB_TECHNICIAN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE])); // Doctors and nurses might need to view collections/stats

router.get("/collections", getCollections);
router.patch("/collections/:id/collect", markCollected);
router.post("/collections/:id/bill", createLabBill);

router.get("/samples", getSamples);
router.get("/validation", getPendingValidation);
router.patch("/validation/:id", validateReport);
import { upload } from "../controllers/radiology.controller.js";
import { uploadLabReport } from "../controllers/lab.controller.js";
router.get("/reports/history", getLabHistory);
router.post("/reports/:id/upload", upload.single("file"), uploadLabReport);

router.get("/analysers", getAnalysers);
router.get("/critical", getCriticalValues);
router.get("/stats", getLabStats);

export default router;
