// ============================================
// HealOS Server — Emergency Routes
// ============================================
import { Router } from "express";
import {
  getEmergencyStats,
  getTriageCases,
  createEmergencyCase,
  updateEmergencyCase,
  dischargeEmergencyCase,
  getResusBays,
  updateResusBay,
  callResusTeam,
  handoverToIcu,
  getInboundAmbulances,
  assignAmbulanceBay,
  getMajorIncident,
  toggleMajorIncident,
  toggleCascadeStep,
} from "../controllers/emergency.controller.js";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { UserRole } from "../models/user.model.js";

const emergencyRouter = Router();

// Secure all emergency department routes
emergencyRouter.use(verifyToken);
emergencyRouter.use(
  requireRole([
    UserRole.EMERGENCY_DOCTOR,
    UserRole.ADMIN,
    UserRole.DOCTOR,
    UserRole.NURSE,
  ])
);

// ---------------------------
// 1. Triage Board
// ---------------------------
emergencyRouter.get("/stats", getEmergencyStats);
emergencyRouter.get("/cases", getTriageCases);
emergencyRouter.post("/cases", createEmergencyCase);
emergencyRouter.patch("/cases/:id", updateEmergencyCase);
emergencyRouter.delete("/cases/:id", dischargeEmergencyCase);

// ---------------------------
// 2. Resus Bays
// ---------------------------
emergencyRouter.get("/bays", getResusBays);
emergencyRouter.patch("/bays/:id", updateResusBay);
emergencyRouter.post("/bays/:id/call-team", callResusTeam);
emergencyRouter.post("/bays/:id/handover-icu", handoverToIcu);

// ---------------------------
// 3. Inbound EMS / Ambulances
// ---------------------------
emergencyRouter.get("/inbound", getInboundAmbulances);
emergencyRouter.post("/inbound/:unit/assign-bay", assignAmbulanceBay);

// ---------------------------
// 4. Major Incident / Disaster Mode
// ---------------------------
emergencyRouter.get("/incident", getMajorIncident);
emergencyRouter.post("/incident/toggle", toggleMajorIncident);
emergencyRouter.patch("/incident/step/:index", toggleCascadeStep);

export default emergencyRouter;
