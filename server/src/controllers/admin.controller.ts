import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { User, UserRole } from "../models/user.model.js";
import { PatientProfile } from "../models/patient-profile.model.js";
import { ProfessionalProfile } from "../models/professional-profile.model.js";
import { Appointment } from "../models/appointment.model.js";
import { emitUserRoleUpdated } from "../socket.js";

/**
 * GET /api/v1/admin/users
 * Returns list of all system users
 */
export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({
      success: true,
      users,
      count: users.length,
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
export const getAllPatients = async (_req: Request, res: Response): Promise<void> => {
  try {
    const patients = await PatientProfile.find().populate("user", "name email phone avatarUrl role").sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({
      success: true,
      patients,
      count: patients.length,
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
 * GET /api/v1/admin/schedule
 * Returns today's appointments and schedules
 */
export const getSchedule = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      date: { $gte: today, $lt: tomorrow },
    })
      .populate("patient", "user")
      .populate("doctor", "user department")
      .sort({ timeSlot: 1 });

    res.status(StatusCodes.OK).json({
      success: true,
      appointments,
    });
  } catch (error) {
    console.error("Error in getSchedule:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching schedule",
    });
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
      .populate("patient", "user")
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
