import express from "express";
import { generateBio } from "../controllers/ai.controller";
import { verifyToken } from "../middleware/auth.middleware";

const router = express.Router();

// All AI routes require authentication
router.use(verifyToken);

router.post("/generate-bio", generateBio);

export default router;
