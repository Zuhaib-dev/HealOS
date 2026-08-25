import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { processChatMessage } from "../controllers/chat.controller.js";

const router = Router();

// Protect all chat routes so only logged-in users can use them
router.use(verifyToken);

router.post("/", processChatMessage);

export default router;
