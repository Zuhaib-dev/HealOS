import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { UserRole } from "../models/user.model.js";
import { 
  getAllUsers, getAllPatients, getFacilityStats, updateUserRole, getStaff, 
  getSchedule, getInvoices, getWards, getInventory, getAuditLogs, getIntegrations, getRoles,
  createWard, updateWard, deleteWard, createInventoryItem, updateInventoryItem, deleteInventoryItem,
  createSchedule, updateSchedule, deleteSchedule
} from "../controllers/admin.controller.js";

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
adminRouter.post("/schedule", createSchedule);
adminRouter.put("/schedule/:id", updateSchedule);
adminRouter.delete("/schedule/:id", deleteSchedule);
adminRouter.get("/invoices", getInvoices);

// Wards CRUD
adminRouter.get("/wards", getWards);
adminRouter.post("/wards", createWard);
adminRouter.put("/wards/:id", updateWard);
adminRouter.delete("/wards/:id", deleteWard);

// Inventory CRUD
adminRouter.get("/inventory", getInventory);
adminRouter.post("/inventory", createInventoryItem);
adminRouter.put("/inventory/:id", updateInventoryItem);
adminRouter.delete("/inventory/:id", deleteInventoryItem);

adminRouter.get("/audit-logs", getAuditLogs);
adminRouter.get("/integrations", getIntegrations);

export default adminRouter;
