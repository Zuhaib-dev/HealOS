import express from "express";
import { generateBio, explainReport, chatReport, generateVitalsSummary } from "../controllers/ai.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = express.Router();

// All AI routes require authentication
router.use(verifyToken);

router.post("/generate-bio", generateBio);
router.post("/explain-report", explainReport);
router.post("/chat-report", chatReport);
router.post("/vitals-summary", generateVitalsSummary);

export default router;
