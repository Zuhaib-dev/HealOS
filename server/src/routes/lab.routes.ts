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
  receiveSpecimen,
  rejectSpecimen,
  recollectSpecimen,
  createAnalyser,
  updateAnalyser,
  rotateAnalyserToken,
  recordAnalyserQC,
  getAnalyserWorklist,
  assignAnalyserWorklist,
  submitManualResults,
  importAnalyserResults,
  getLabAnalytes,
  saveLabAnalyte,
  getLabCriticalContacts,
  saveLabCriticalContact,
  getLabAnalytics,
} from "../controllers/lab.controller.js";
import { UserRole } from "../models/user.model.js";

const router = Router();

// Analyzer devices authenticate with per-device bearer tokens rather than user sessions.
router.post("/integration/analysers/:id/results", importAnalyserResults);

router.use(verifyToken);
// Assuming LAB_TECH acts as the general lab worker role
router.use(requireRole([UserRole.LAB_TECHNICIAN]));

router.get("/collections", getCollections);
router.patch("/collections/:id/collect", markCollected);
router.patch("/specimens/:id/receive", receiveSpecimen);
router.patch("/specimens/:id/reject", rejectSpecimen);
router.patch("/specimens/:id/recollect", recollectSpecimen);
router.post("/specimens/:id/results", submitManualResults);
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
router.post("/analysers", createAnalyser);
router.patch("/analysers/:id", updateAnalyser);
router.post("/analysers/:id/token", rotateAnalyserToken);
router.post("/analysers/:id/qc", recordAnalyserQC);
router.get("/analysers/:id/worklist", getAnalyserWorklist);
router.post("/analysers/:id/worklist", assignAnalyserWorklist);
router.get("/analytes", getLabAnalytes);
router.post("/analytes", saveLabAnalyte);
router.get("/critical/contacts", getLabCriticalContacts);
router.post("/critical/contacts", saveLabCriticalContact);
router.patch("/critical/contacts/:id", saveLabCriticalContact);
router.get("/analytics", getLabAnalytics);
router.get("/critical", getCriticalValues);
router.get("/stats", getLabStats);

export default router;
