import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { User } from "../models/user.model.js";
import { PatientProfile } from "../models/patient-profile.model.js";
import { ProfessionalProfile } from "../models/professional-profile.model.js";
import { Appointment } from "../models/appointment.model.js";

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
