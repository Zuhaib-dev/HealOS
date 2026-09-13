import express from "express";
import { generateBio, explainReport } from "../controllers/ai.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = express.Router();

// All AI routes require authentication
router.use(verifyToken);

router.post("/generate-bio", generateBio);
router.post("/explain-report", explainReport);

export default router;
