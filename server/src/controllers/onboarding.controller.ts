import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ProfessionalProfile, ProfileStatus, PatientProfile, User, UserRole } from "../models";
import { z } from "zod";

const applyOnboardingSchema = z.object({
  requestedRole: z.enum([UserRole.DOCTOR, UserRole.RADIOLOGIST]),
  degree: z.string().min(1, "Degree is required"),
  specialization: z.string().min(1, "Specialization is required"),
  experienceYears: z.number().min(0),
  licenseNumber: z.string().min(1, "License number is required"),
  documentUrls: z.array(z.string()).default([]),
});

const rejectOnboardingSchema = z.object({
  rejectionReason: z.string().min(5, "Please provide a detailed rejection reason"),
});

const updatePatientProfileSchema = z.object({
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).optional(),
  emergencyPhone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medicalHistory: z.string().optional(),
  address: z.string().optional(),
});

import { emitUserRoleUpdated, emitNewOnboardingRequest } from "../socket.js";

// ==========================================
// 1. Patient Profile Onboarding
// ==========================================
export const updatePatientProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const parsed = updatePatientProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid patient profile data",
        errors: parsed.error.format(),
      });
      return;
    }

    let profile = await PatientProfile.findOne({ user: userId });
    if (!profile) {
      profile = new PatientProfile({ user: userId });
    }

    Object.assign(profile, parsed.data);
    profile.isComplete = true;
    await profile.save();

    const userObj = await User.findById(userId);
    if (userObj) {
      if (userObj.role === UserRole.USER) {
        userObj.role = UserRole.PATIENT;
        emitUserRoleUpdated(userObj._id.toString(), UserRole.PATIENT);
      }
      if (parsed.data.emergencyPhone) {
        userObj.phone = parsed.data.emergencyPhone;
      }
      await userObj.save();
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Patient health profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Error in updatePatientProfile:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while updating patient profile",
    });
  }
};

export const getPatientProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const profile = await PatientProfile.findOne({ user: userId });

    res.status(StatusCodes.OK).json({
      success: true,
      profile: profile || null,
    });
  } catch (error) {
    console.error("Error in getPatientProfile:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while fetching patient profile",
    });
  }
};

// ==========================================
// 2. Clinician / Doctor Role Application
// ==========================================
export const applyForRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    const parsed = applyOnboardingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid application data",
        errors: parsed.error.format(),
      });
      return;
    }

    const existingProfile = await ProfessionalProfile.findOne({
      user: userId,
      status: { $in: [ProfileStatus.PENDING, ProfileStatus.UNDER_REVIEW, ProfileStatus.APPROVED] },
    });

    if (existingProfile) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: `You already have an application with status: ${existingProfile.status}`,
        profile: existingProfile,
      });
      return;
    }

    const newProfile = await ProfessionalProfile.create({
      user: userId,
      ...parsed.data,
      status: ProfileStatus.PENDING,
      onboardingStep: 1,
    });

    emitNewOnboardingRequest(newProfile);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Clinician application submitted successfully",
      profile: newProfile,
    });
  } catch (error) {
    console.error("Error in applyForRole:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while applying for role",
    });
  }
};

export const getMyStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const profile = await ProfessionalProfile.findOne({ user: userId }).sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      profile: profile || null,
    });
  } catch (error) {
    console.error("Error in getMyStatus:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while fetching status",
    });
  }
};

// ==========================================
// 3. Admin Approval Operations
// ==========================================
export const getPendingRequests = async (_req: Request, res: Response): Promise<void> => {
  try {
    const profiles = await ProfessionalProfile.find({
      status: { $in: [ProfileStatus.PENDING, ProfileStatus.UNDER_REVIEW] },
    }).populate("user", "name email phone avatarUrl");

    res.status(StatusCodes.OK).json({
      success: true,
      count: profiles.length,
      profiles,
    });
  } catch (error) {
    console.error("Error in getPendingRequests:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while fetching pending requests",
    });
  }
};

export const approveRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;

    const profile = await ProfessionalProfile.findById(id);
    if (!profile) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Professional profile not found",
      });
      return;
    }

    if (profile.status === ProfileStatus.APPROVED) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Profile is already approved",
      });
      return;
    }

    profile.status = ProfileStatus.APPROVED;
    profile.reviewedBy = adminId;
    await profile.save();

    const user = await User.findById(profile.user);
    if (user) {
      user.role = profile.requestedRole;
      await user.save();
      emitUserRoleUpdated(user._id.toString(), profile.requestedRole);
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Profile approved. User role upgraded to ${profile.requestedRole}`,
      profile,
    });
  } catch (error) {
    console.error("Error in approveRequest:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while approving request",
    });
  }
};

export const rejectRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;

    const parsed = rejectOnboardingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Rejection reason is required",
        errors: parsed.error.format(),
      });
      return;
    }

    const profile = await ProfessionalProfile.findById(id);
    if (!profile) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Professional profile not found",
      });
      return;
    }

    profile.status = ProfileStatus.REJECTED;
    profile.rejectionReason = parsed.data.rejectionReason;
    profile.reviewedBy = adminId;
    await profile.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Application rejected with reason",
      profile,
    });
  } catch (error) {
    console.error("Error in rejectRequest:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while rejecting request",
    });
  }
};
