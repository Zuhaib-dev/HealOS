import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { UserRole } from "../models/user.model.js";
import { getAllUsers, getAllPatients, getFacilityStats, updateUserRole, getStaff, getSchedule, getInvoices, getWards, getInventory, getAuditLogs, getIntegrations, getRoles } from "../controllers/admin.controller.js";

const adminRouter = Router();

adminRouter.use(verifyToken);
adminRouter.use(requireRole([UserRole.ADMIN]));

adminRouter.get("/users", getAllUsers);
adminRouter.patch("/users/:id/role", updateUserRole);
adminRouter.get("/patients", getAllPatients);
adminRouter.get("/stats", getFacilityStats);
adminRouter.get("/staff", getStaff);
adminRouter.get("/roles", getRoles);
adminRouter.get("/schedule", getSchedule);
adminRouter.get("/invoices", getInvoices);
adminRouter.get("/wards", getWards);
adminRouter.get("/inventory", getInventory);
adminRouter.get("/audit-logs", getAuditLogs);
adminRouter.get("/integrations", getIntegrations);

export default adminRouter;
