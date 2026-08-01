import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { User, UserRole } from "../models";
import { envConfig } from "../config/env";
import { z } from "zod";

const syncGoogleUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  googleId: z.string(),
  avatarUrl: z.string().optional(),
});

const generateToken = (userId: string, role: UserRole): string => {
  return jwt.sign({ userId, role }, envConfig.JWT_SECRET, {
    expiresIn: envConfig.JWT_EXPIRES_IN,
  });
};

export const syncGoogleUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = syncGoogleUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid payload data",
        errors: parsed.error.format(),
      });
      return;
    }

    const { email, name, googleId, avatarUrl } = parsed.data;

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = await User.create({
        email,
        name,
        googleId,
        avatarUrl,
        isEmailVerified: true, // Google accounts are implicitly verified
        role: UserRole.USER,
      });
    } else {
      // Update existing user with google id and avatar if missing
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (!user.avatarUrl && avatarUrl) {
        user.avatarUrl = avatarUrl;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    const token = generateToken(user._id as string, user.role);

    res.status(StatusCodes.OK).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Error in syncGoogleUser:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while syncing the user",
    });
  }
};
