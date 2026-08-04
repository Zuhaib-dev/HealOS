import { Router } from "express";
import { createRazorpayOrder, verifyPayment } from "../controllers/payment.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

// Order generation usually requires auth, but payment verification might come from frontend or webhook
router.post("/create-order", verifyToken, createRazorpayOrder);
router.post("/verify", verifyToken, verifyPayment);

export default router;
