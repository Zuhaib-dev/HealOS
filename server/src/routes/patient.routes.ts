import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { getPatientDashboard, updatePatientProfile, payInvoice, uploadPatientDocument } from "../controllers/patient.controller.js";
import { UserRole } from "../models/user.model.js";
import { upload } from "../controllers/radiology.controller.js";

const router = Router();

router.use(verifyToken);
router.use(requireRole([UserRole.PATIENT, UserRole.ADMIN]));

router.get("/dashboard", getPatientDashboard);
router.put("/profile", updatePatientProfile);
router.post("/invoices/:id/pay", payInvoice);
router.post("/upload", upload.single("file"), uploadPatientDocument);

export default router;
