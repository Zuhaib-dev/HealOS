import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ProfessionalProfile, ProfileStatus, User, UserRole } from "../models";
import { z } from "zod";

const applyOnboardingSchema = z.object({
  requestedRole: z.enum([UserRole.DOCTOR, UserRole.RADIOLOGIST]),
  degree: z.string().min(1),
  specialization: z.string().min(1),
  experienceYears: z.number().min(0),
  licenseNumber: z.string().min(1),
  documentUrls: z.array(z.string()).default([]),
});

const rejectOnboardingSchema = z.object({
  rejectionReason: z.string().min(10, "Please provide a detailed rejection reason"),
});

// User applies for a professional role
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

    // Check if user already has a pending or approved application
    const existingProfile = await ProfessionalProfile.findOne({
      user: userId,
      status: { $in: [ProfileStatus.PENDING, ProfileStatus.UNDER_REVIEW, ProfileStatus.APPROVED] }
    });

    if (existingProfile) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: `You already have a profile with status: ${existingProfile.status}`,
      });
      return;
    }

    const newProfile = await ProfessionalProfile.create({
      user: userId,
      ...parsed.data,
      status: ProfileStatus.PENDING,
      onboardingStep: 1, // Assume step 1 completed
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Application submitted successfully",
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

// Admin lists all pending requests
export const getPendingRequests = async (_req: Request, res: Response): Promise<void> => {
  try {
    const profiles = await ProfessionalProfile.find({
      status: { $in: [ProfileStatus.PENDING, ProfileStatus.UNDER_REVIEW] }
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
      message: "Server error while fetching requests",
    });
  }
};

// Admin approves request
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

    // Update profile
    profile.status = ProfileStatus.APPROVED;
    profile.reviewedBy = adminId;
    await profile.save();

    // Update user role
    const user = await User.findById(profile.user);
    if (user) {
      user.role = profile.requestedRole;
      await user.save();
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

// Admin rejects request
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
      message: "Profile rejected",
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
