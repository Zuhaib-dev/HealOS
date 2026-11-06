import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getDiagnosticReportFile } from "../controllers/report-file.controller.js";

const router = Router();
router.use(verifyToken);
router.get("/:id/file", getDiagnosticReportFile);
export default router;
