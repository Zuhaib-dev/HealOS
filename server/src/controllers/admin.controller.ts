import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { User, UserRole } from "../models/user.model.js";
import { PatientProfile } from "../models/patient-profile.model.js";
import { ProfessionalProfile } from "../models/professional-profile.model.js";
import { Appointment } from "../models/appointment.model.js";
import { emitAdminDataChanged, emitUserRoleUpdated } from "../socket.js";
import { logAudit } from "../utils/audit.js";

const getPagination = (req: Request) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const paginationMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  pages: Math.max(Math.ceil(total / limit), 1),
});

/**
 * GET /api/v1/admin/users
 * Returns list of all system users
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPagination(req);
    const queryText = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const role = typeof req.query.role === "string" ? req.query.role.trim() : "";
    const query: Record<string, any> = {};

    if (queryText) {
      query.$or = [
        { name: { $regex: queryText, $options: "i" } },
        { email: { $regex: queryText, $options: "i" } },
        { phone: { $regex: queryText, $options: "i" } },
      ];
    }

    if (role && Object.values(UserRole).includes(role as UserRole)) {
      query.role = role;
    }

    const [users, total] = await Promise.all([
      User.find(query).select("-passwordHash").sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      users,
      count: total,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching user list",
    });
  }
};

/**
 * GET /api/v1/admin/patients
 * Returns list of all patient profiles
 */
export const getAllPatients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = getPagination(req);
    const queryText = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const matchingUsers = queryText
      ? await User.find({
          $or: [
            { name: { $regex: queryText, $options: "i" } },
            { email: { $regex: queryText, $options: "i" } },
            { phone: { $regex: queryText, $options: "i" } },
          ],
        }).select("_id")
      : [];

    const query = queryText
      ? {
          $or: [
            { user: { $in: matchingUsers.map((user) => user._id) } },
            { emergencyContactName: { $regex: queryText, $options: "i" } },
            { emergencyPhone: { $regex: queryText, $options: "i" } },
          ],
        }
      : {};

    const [patients, total] = await Promise.all([
      PatientProfile.find(query)
        .populate("user", "name email phone avatarUrl role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PatientProfile.countDocuments(query),
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      patients,
      count: total,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error("Error in getAllPatients:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching patient list",
    });
  }
};

/**
 * GET /api/v1/admin/stats
 * Returns overall facility statistics
 */
export const getFacilityStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPatients = await PatientProfile.countDocuments({ isComplete: true });
    const totalClinicians = await ProfessionalProfile.countDocuments({ status: "APPROVED" });
    const totalAppointments = await Appointment.countDocuments();
    const pendingApprovals = await ProfessionalProfile.countDocuments({ status: "PENDING" });

    res.status(StatusCodes.OK).json({
      success: true,
      stats: {
        totalUsers,
        totalPatients,
        totalClinicians,
        totalAppointments,
        pendingApprovals,
      },
    });
  } catch (error) {
    console.error("Error in getFacilityStats:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching facility stats",
    });
  }
};

/**
 * PATCH /api/v1/admin/users/:id/role
 * Updates a user's role directly (e.g. promoting to RADIOLOGIST or DOCTOR)
 */
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(UserRole).includes(role)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid user role specified",
      });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    user.role = role;
    await user.save();

    // Emit socket event for real-time role promotion in client browser
    emitUserRoleUpdated(user._id.toString(), role);
    emitAdminDataChanged(["users", "staff", "roles", "audit"], "admin_role_update");

    // Write immutable audit log
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(actor, `Elevated user role to ${role}`, `user:${user._id.toString().slice(-6)}`, "warn");

    res.status(StatusCodes.OK).json({
      success: true,
      message: `User ${user.name}'s role updated to ${role} in real-time`,
      user,
    });
  } catch (error) {
    console.error("Error in updateUserRole:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while updating user role",
    });
  }
};

/**
 * GET /api/v1/admin/staff
 * Returns list of all professional profiles (staff)
 */
export const getStaff = async (_req: Request, res: Response): Promise<void> => {
  try {
    const staff = await ProfessionalProfile.find()
      .populate("user", "name email phone role avatarUrl")
      .sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({
      success: true,
      staff,
      count: staff.length,
    });
  } catch (error) {
    console.error("Error in getStaff:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching staff list",
    });
  }
};

/**
 * GET /api/v1/admin/roles
 * Returns role seat counts and static permission scopes for visible roles
 */
export const getRoles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const counts = await User.aggregate([
      { $group: { _id: "$role", seats: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const seatMap = counts.reduce<Record<string, number>>((acc, row) => {
      acc[row._id] = row.seats;
      return acc;
    }, {});

    const scopesByRole: Record<string, Record<string, "full" | "read" | "none">> = {
      ADMIN: { Records: "full", Orders: "full", Prescribe: "none", Billing: "full", Admin: "full", Audit: "full" },
      DOCTOR: { Records: "full", Orders: "full", Prescribe: "full", Billing: "read", Admin: "none", Audit: "none" },
      RADIOLOGIST: { Records: "read", Orders: "read", Prescribe: "none", Billing: "none", Admin: "none", Audit: "none" },
      NURSE: { Records: "read", Orders: "read", Prescribe: "none", Billing: "none", Admin: "none", Audit: "none" },
      PATIENT: { Records: "read", Orders: "none", Prescribe: "none", Billing: "read", Admin: "none", Audit: "none" },
      RECEPTIONIST: { Records: "read", Orders: "read", Prescribe: "none", Billing: "read", Admin: "none", Audit: "none" },
      PHARMACIST: { Records: "read", Orders: "read", Prescribe: "none", Billing: "none", Admin: "none", Audit: "none" },
      EMERGENCY_DOCTOR: { Records: "full", Orders: "full", Prescribe: "full", Billing: "none", Admin: "none", Audit: "none" },
      LAB_TECHNICIAN: { Records: "read", Orders: "read", Prescribe: "none", Billing: "none", Admin: "none", Audit: "none" },
      USER: { Records: "none", Orders: "none", Prescribe: "none", Billing: "none", Admin: "none", Audit: "none" },
    };

    const roles = Object.values(UserRole).map((role) => ({
      role,
      seats: seatMap[role] || 0,
      scopes: scopesByRole[role],
    }));

    res.status(StatusCodes.OK).json({
      success: true,
      permissionScopes: ["Records", "Orders", "Prescribe", "Billing", "Admin", "Audit"],
      roles,
    });
  } catch (error) {
    console.error("Error in getRoles:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error fetching roles" });
  }
};

/**
 * GET /api/v1/admin/schedule
 * Returns today's appointments and schedules
 */
export const getSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const dateQuery = req.query.date ? new Date(req.query.date as string) : new Date();
    dateQuery.setHours(0, 0, 0, 0);
    const tomorrow = new Date(dateQuery);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Convert to YYYY-MM-DD for Schedule string dates
    const dateStr = dateQuery.toISOString().split("T")[0];

    const appointments = await Appointment.find({
      date: { $gte: dateQuery, $lt: tomorrow },
    })
      .populate("patient", "user")
      .populate("doctor", "user department")
      .sort({ timeSlot: 1 });

    const { Schedule } = await import("../models/schedule.model.js");
    const schedules = await Schedule.find({ date: dateStr })
      .populate("user", "name email phone avatarUrl role")
      .sort({ startTime: 1 });

    res.status(StatusCodes.OK).json({
      success: true,
      appointments,
      schedules,
    });
  } catch (error) {
    console.error("Error in getSchedule:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching schedule",
    });
  }
};

export const createSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Schedule } = await import("../models/schedule.model.js");
    const schedule = await Schedule.create(req.body);
    emitAdminDataChanged(["schedule"], "schedule_created");
    res.status(StatusCodes.CREATED).json({ success: true, schedule });
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error creating schedule" });
  }
};

export const updateSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Schedule } = await import("../models/schedule.model.js");
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!schedule) { res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Schedule not found" }); return; }
    emitAdminDataChanged(["schedule"], "schedule_updated");
    res.status(StatusCodes.OK).json({ success: true, schedule });
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error updating schedule" });
  }
};

export const deleteSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Schedule } = await import("../models/schedule.model.js");
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) { res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Schedule not found" }); return; }
    emitAdminDataChanged(["schedule"], "schedule_deleted");
    res.status(StatusCodes.OK).json({ success: true, message: "Schedule deleted" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error deleting schedule" });
  }
};

/**
 * GET /api/v1/admin/invoices
 * Returns all invoices
 */
export const getInvoices = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Dynamic import to avoid undefined if Invoice model is not imported at top
    const { Invoice } = await import("../models/invoice.model.js");
    const invoices = await Invoice.find()
      .populate("patient", "name email phone avatarUrl")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      invoices,
      count: invoices.length,
    });
  } catch (error) {
    console.error("Error in getInvoices:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching invoices",
    });
  }
};

/**
 * GET /api/v1/admin/wards
 * Returns all wards
 */
export const getWards = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { Ward } = await import("../models/ward.model.js");
    const wards = await Ward.find().sort({ name: 1 });
    res.status(StatusCodes.OK).json({ success: true, wards });
  } catch (error) {
    console.error("Error in getWards:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error fetching wards" });
  }
};

/**
 * GET /api/v1/admin/inventory
 * Returns all inventory supplies
 */
export const getInventory = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { Inventory } = await import("../models/inventory.model.js");
    const inventory = await Inventory.find().sort({ itemName: 1 });
    res.status(StatusCodes.OK).json({ success: true, inventory });
  } catch (error) {
    console.error("Error in getInventory:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error fetching inventory" });
  }
};

/**
 * GET /api/v1/admin/audit-logs
 * Returns audit logs
 */
export const getAuditLogs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { AuditLog } = await import("../models/audit-log.model.js");
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.status(StatusCodes.OK).json({ success: true, logs });
  } catch (error) {
    console.error("Error in getAuditLogs:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error fetching audit logs" });
  }
};

/**
 * GET /api/v1/admin/integrations
 * Returns integrations and API keys
 */
export const getIntegrations = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { Integration } = await import("../models/integration.model.js");
    const integrations = await Integration.find().sort({ type: -1, name: 1, label: 1 });
    res.status(StatusCodes.OK).json({ success: true, integrations });
  } catch (error) {
    console.error("Error in getIntegrations:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error fetching integrations" });
  }
};

export const createWard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Ward } = await import("../models/ward.model.js");
    const ward = await Ward.create(req.body);
    emitAdminDataChanged(["wards"], "ward_created");
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(actor, `Created ward ${ward.name}`, `ward:${ward._id.toString().slice(-6)}`, "info");
    res.status(StatusCodes.CREATED).json({ success: true, ward });
  } catch (error) {
    console.error("Error creating ward:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error creating ward" });
  }
};

export const updateWard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Ward } = await import("../models/ward.model.js");
    const ward = await Ward.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ward) { res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Ward not found" }); return; }
    emitAdminDataChanged(["wards"], "ward_updated");
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(actor, `Updated ward ${ward.name}`, `ward:${ward._id.toString().slice(-6)}`, "info");
    res.status(StatusCodes.OK).json({ success: true, ward });
  } catch (error) {
    console.error("Error updating ward:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error updating ward" });
  }
};

export const deleteWard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Ward } = await import("../models/ward.model.js");
    const ward = await Ward.findByIdAndDelete(req.params.id);
    if (!ward) { res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Ward not found" }); return; }
    emitAdminDataChanged(["wards"], "ward_deleted");
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(actor, `Deleted ward ${ward.name}`, `ward:${ward._id.toString().slice(-6)}`, "warn");
    res.status(StatusCodes.OK).json({ success: true, message: "Ward deleted" });
  } catch (error) {
    console.error("Error deleting ward:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error deleting ward" });
  }
};

export const createInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Inventory } = await import("../models/inventory.model.js");
    const item = await Inventory.create(req.body);
    emitAdminDataChanged(["inventory"], "inventory_created");
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(actor, `Created inventory item ${item.itemName}`, `inventory:${item._id.toString().slice(-6)}`, "info");
    res.status(StatusCodes.CREATED).json({ success: true, item });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error creating inventory item" });
  }
};

export const updateInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Inventory } = await import("../models/inventory.model.js");
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) { res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Item not found" }); return; }
    emitAdminDataChanged(["inventory"], "inventory_updated");
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(actor, `Updated inventory item ${item.itemName}`, `inventory:${item._id.toString().slice(-6)}`, "info");
    res.status(StatusCodes.OK).json({ success: true, item });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error updating inventory item" });
  }
};

export const deleteInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Inventory } = await import("../models/inventory.model.js");
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) { res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Item not found" }); return; }
    emitAdminDataChanged(["inventory"], "inventory_deleted");
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(actor, `Deleted inventory item ${item.itemName}`, `inventory:${item._id.toString().slice(-6)}`, "warn");
    res.status(StatusCodes.OK).json({ success: true, message: "Item deleted" });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error deleting inventory item" });
  }
};
