import mongoose from "mongoose";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { StatusCodes } from "http-status-codes";
import { User, UserRole, OTP } from "../models";
import { envConfig } from "../config/env";
import { sendOtpEmail } from "../utils/mailer";
import { z } from "zod";
import { logAudit } from "../utils/audit.js";

const isDbConnected = (res: Response): boolean => {
  if (mongoose.connection.readyState !== 1) {
    res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      success: false,
      message: "MongoDB database is not connected. Please start MongoDB to perform this action.",
    });
    return false;
  }
  return true;
};

// ---------------------------
// Zod Validation Schemas
// ---------------------------
const syncGoogleUserSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1),
  googleId: z.string().trim().min(1),
  avatarUrl: z.string().optional(),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
});

const resendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const updatePhoneSchema = z.object({
  phone: z.string().trim().min(7, "Invalid phone number"),
});

// Helper to generate 6-digit OTP
const generate6DigitOtp = (): string => {
  return randomInt(100000, 1000000).toString();
};

const sendOtpOrRespond = async (
  res: Response,
  email: string,
  otp: string,
  purpose: "email_verification" | "password_reset" = "email_verification"
): Promise<boolean> => {
  const emailSent = await sendOtpEmail(email, otp, purpose);
  if (emailSent) return true;

  await OTP.deleteMany({ email, otp, purpose });
  res.status(StatusCodes.BAD_GATEWAY).json({
    success: false,
    message: `We couldn't send the ${purpose === "password_reset" ? "password reset" : "verification"} email right now. Please try again in a moment.`,
  });
  return false;
};

// Helper to generate JWT Token
const generateToken = (userId: string, role: UserRole): string => {
  return jwt.sign({ userId, role: normalizeUserRole(role) }, envConfig.JWT_SECRET, {
    expiresIn: envConfig.JWT_EXPIRES_IN as any,
  });
};

const normalizeUserRole = (role: string): UserRole => {
  if (!role) return UserRole.USER;
  const upperRole = role.toUpperCase();
  if (upperRole === "PATIENT" || role === "patient") return UserRole.PATIENT;
  if (Object.values(UserRole).includes(upperRole as UserRole)) {
    return upperRole as UserRole;
  }
  return UserRole.USER;
};

const serializeAuthUser = (user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  phone?: string;
  isEmailVerified: boolean;
}) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: normalizeUserRole(user.role),
  avatarUrl: user.avatarUrl,
  phone: user.phone,
  isEmailVerified: user.isEmailVerified,
});

const hasValidSyncSecret = (req: Request): boolean => {
  if (!envConfig.AUTH_SYNC_SECRET) {
    return envConfig.NODE_ENV !== "production";
  }
  return req.headers["x-sync-secret"] === envConfig.AUTH_SYNC_SECRET;
};

// ---------------------------
// 1. Google OAuth Sync Endpoint
// ---------------------------
export const syncGoogleUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isDbConnected(res)) return;

    if (!hasValidSyncSecret(req)) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized sync request",
      });
      return;
    }

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
      user = await User.create({
        email,
        name,
        googleId,
        avatarUrl,
        isEmailVerified: true, // Google OAuth users are implicitly verified
        role: UserRole.USER,
      });
    } else {
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

    const normalizedRole = normalizeUserRole(user.role);
    const token = generateToken(user._id.toString(), normalizedRole);

    await logAudit(`user:${user._id.toString().slice(-6)}`, "Successful SSO login via Google", `email:${user.email}`, "info");

    res.status(StatusCodes.OK).json({
      success: true,
      token,
      user: serializeAuthUser(user),
    });
  } catch (error) {
    console.error("Error in syncGoogleUser:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while syncing the user",
    });
  }
};

// ---------------------------
// 2. Register (Email + Password)
// ---------------------------
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isDbConnected(res)) return;

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.format(),
      });
      return;
    }

    const { name, email, password } = parsed.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "An account with this email already exists. Please log in.",
        });
        return;
      }
      // If user exists but is not verified, update their password and re-send OTP
      const hashedPassword = await bcrypt.hash(password, 10);
      existingUser.name = name;
      existingUser.password = hashedPassword;
      await existingUser.save();
    } else {
      // Create new unverified user
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        name,
        email,
        password: hashedPassword,
        isEmailVerified: false,
        role: UserRole.USER,
      });
    }

    // Generate & save 6-digit OTP
    const otpCode = generate6DigitOtp();
    await OTP.deleteMany({ email, purpose: "email_verification" }); // Delete old OTPs for this email
    await OTP.create({ email, otp: otpCode, purpose: "email_verification" });

    // Send OTP email via Nodemailer
    if (!(await sendOtpOrRespond(res, email, otpCode))) return;

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Registration successful. Verification OTP sent to your email.",
      email,
    });
  } catch (error) {
    console.error("Error in register:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred during registration",
    });
  }
};

// ---------------------------
// 3. Verify OTP
// ---------------------------
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isDbConnected(res)) return;

    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid OTP format",
        errors: parsed.error.format(),
      });
      return;
    }

    const { email, otp } = parsed.data;

    const otpRecord = await OTP.findOne({ email, otp, purpose: "email_verification" });
    if (!otpRecord) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid or expired OTP code. Please request a new one.",
      });
      return;
    }

    // Mark user as verified
    const user = await User.findOne({ email });
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User account not found",
      });
      return;
    }

    user.isEmailVerified = true;
    await user.save();

    // Delete used OTP
    await OTP.deleteMany({ email, purpose: "email_verification" });

    // Issue JWT token
    const normalizedRole = normalizeUserRole(user.role);
    const token = generateToken(user._id.toString(), normalizedRole);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Email verified successfully",
      token,
      user: serializeAuthUser(user),
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred during OTP verification",
    });
  }
};

// ---------------------------
// 4. Resend OTP
// ---------------------------
export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isDbConnected(res)) return;

    const parsed = resendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid email",
      });
      return;
    }

    const { email } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User account not found",
      });
      return;
    }
    if (user.isEmailVerified) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "This email is already verified. Please log in.",
      });
      return;
    }

    const otpCode = generate6DigitOtp();
    await OTP.deleteMany({ email, purpose: "email_verification" });
    await OTP.create({ email, otp: otpCode, purpose: "email_verification" });

    if (!(await sendOtpOrRespond(res, email, otpCode))) return;

    res.status(StatusCodes.OK).json({
      success: true,
      message: "A new 6-digit OTP code has been sent to your email.",
    });
  } catch (error) {
    console.error("Error in resendOtp:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};

// ---------------------------
// 5. Forgot Password
// ---------------------------
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isDbConnected(res)) return;

    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid email",
      });
      return;
    }

    const { email } = parsed.data;
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      res.status(StatusCodes.OK).json({
        success: true,
        message: "If an account exists for this email, a reset code has been sent.",
      });
      return;
    }

    const otpCode = generate6DigitOtp();
    await OTP.deleteMany({ email, purpose: "password_reset" });
    await OTP.create({ email, otp: otpCode, purpose: "password_reset" });

    if (!(await sendOtpOrRespond(res, email, otpCode, "password_reset"))) return;

    res.status(StatusCodes.OK).json({
      success: true,
      message: "If an account exists for this email, a reset code has been sent.",
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to send password reset code",
    });
  }
};

// ---------------------------
// 6. Reset Password
// ---------------------------
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isDbConnected(res)) return;

    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid reset request",
        errors: parsed.error.format(),
      });
      return;
    }

    const { email, otp, password } = parsed.data;
    const otpRecord = await OTP.findOne({ email, otp, purpose: "password_reset" });
    if (!otpRecord) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid or expired reset code. Please request a new one.",
      });
      return;
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User account not found",
      });
      return;
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    await OTP.deleteMany({ email, purpose: "password_reset" });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Password reset successfully. Please sign in with your new password.",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};

// ---------------------------
// 7. Login (Email + Password)
// ---------------------------
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isDbConnected(res)) return;

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid email or password format",
      });
      return;
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Require email verification
    if (!user.isEmailVerified) {
      // Re-send OTP automatically
      const otpCode = generate6DigitOtp();
      await OTP.deleteMany({ email, purpose: "email_verification" });
      await OTP.create({ email, otp: otpCode, purpose: "email_verification" });
      if (!(await sendOtpOrRespond(res, email, otpCode))) return;

      res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        requiresVerification: true,
        message: "Email is not verified. A new 6-digit OTP has been sent to your email.",
      });
      return;
    }

    const normalizedRole = normalizeUserRole(user.role);
    const token = generateToken(user._id.toString(), normalizedRole);

    await logAudit(`user:${user._id.toString().slice(-6)}`, "Successful password login", `email:${user.email}`, "info");

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Logged in successfully",
      token,
      user: serializeAuthUser(user),
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred during login",
    });
  }
};

// ---------------------------
// 6. Get Current User Profile (/me)
// ---------------------------
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Not authenticated",
      });
      return;
    }

    res.status(StatusCodes.OK).json({
      success: true,
      user: serializeAuthUser(req.user),
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error fetching user profile",
    });
  }
};

// ---------------------------
// 7. Update Phone Number
// ---------------------------
export const updatePhone = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const parsed = updatePhoneSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid phone number format",
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    user.phone = parsed.data.phone;
    await user.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Phone number updated successfully",
      user: serializeAuthUser(user),
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error updating phone number",
    });
  }
};
