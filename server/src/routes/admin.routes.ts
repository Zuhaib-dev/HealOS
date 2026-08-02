import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { UserRole } from "../models/user.model.js";
import { getAllUsers, getAllPatients, getFacilityStats, updateUserRole } from "../controllers/admin.controller.js";

const adminRouter = Router();

adminRouter.use(verifyToken);
adminRouter.use(requireRole([UserRole.ADMIN]));

adminRouter.get("/users", getAllUsers);
adminRouter.patch("/users/:id/role", updateUserRole);
adminRouter.get("/patients", getAllPatients);
adminRouter.get("/stats", getFacilityStats);

export default adminRouter;
