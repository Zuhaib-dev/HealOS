import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { User, UserRole, OTP } from "../models";
import { envConfig } from "../config/env";
import { sendOtpEmail } from "../utils/mailer";
import { z } from "zod";

// ---------------------------
// Zod Validation Schemas
// ---------------------------
const syncGoogleUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  googleId: z.string(),
  avatarUrl: z.string().optional(),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

const resendOtpSchema = z.object({
  email: z.string().email(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const updatePhoneSchema = z.object({
  phone: z.string().min(7, "Invalid phone number"),
});

// Helper to generate 6-digit OTP
const generate6DigitOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to generate JWT Token
const generateToken = (userId: string, role: UserRole): string => {
  return jwt.sign({ userId, role }, envConfig.JWT_SECRET, {
    expiresIn: envConfig.JWT_EXPIRES_IN as any,
  });
};

// ---------------------------
// 1. Sync Google User
// ---------------------------
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

    const token = generateToken(user._id.toString(), user.role);

    res.status(StatusCodes.OK).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
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

// ---------------------------
// 2. Register (Email + Password)
// ---------------------------
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
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
    await OTP.deleteMany({ email }); // Delete old OTPs for this email
    await OTP.create({ email, otp: otpCode });

    // Send OTP email via Nodemailer
    await sendOtpEmail(email, otpCode);

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

    const otpRecord = await OTP.findOne({ email, otp });
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
    await OTP.deleteMany({ email });

    // Issue JWT token
    const token = generateToken(user._id.toString(), user.role);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Email verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
      },
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

    const otpCode = generate6DigitOtp();
    await OTP.deleteMany({ email });
    await OTP.create({ email, otp: otpCode });

    await sendOtpEmail(email, otpCode);

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
// 5. Login (Email + Password)
// ---------------------------
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
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
      await OTP.deleteMany({ email });
      await OTP.create({ email, otp: otpCode });
      await sendOtpEmail(email, otpCode);

      res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        requiresVerification: true,
        message: "Email is not verified. A new 6-digit OTP has been sent to your email.",
      });
      return;
    }

    const token = generateToken(user._id.toString(), user.role);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Logged in successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
      },
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
      user: req.user,
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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error updating phone number",
    });
  }
};
