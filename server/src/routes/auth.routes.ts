import { Router } from "express";
import { syncGoogleUser } from "../controllers/auth.controller";

const router = Router();

router.post("/sync", syncGoogleUser);

export default router;
