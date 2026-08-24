import jwt from "jsonwebtoken";
import { randomInt } from "crypto";
import { UserRole, OTP } from "../models";
import { envConfig } from "../config/env";
import { sendOtpEmail } from "../utils/mailer";

export const normalizeUserRole = (role: string): UserRole => {
  if (!role) return UserRole.USER;
  const upperRole = role.toUpperCase();
  if (upperRole === "PATIENT" || role === "patient") return UserRole.PATIENT;
  if (Object.values(UserRole).includes(upperRole as UserRole)) {
    return upperRole as UserRole;
  }
  return UserRole.USER;
};

export const generateToken = (userId: string, role: UserRole, tokenVersion: number = 0): string => {
  return jwt.sign({ userId, role: normalizeUserRole(role), tokenVersion }, envConfig.JWT_SECRET, {
    expiresIn: envConfig.JWT_EXPIRES_IN as any,
  });
};

export const generate6DigitOtp = (): string => {
  return randomInt(100000, 1000000).toString();
};

export const sendOtpOrRespond = async (
  email: string,
  otp: string,
  purpose: "email_verification" | "password_reset" = "email_verification"
): Promise<{ success: boolean; message?: string }> => {
  const emailSent = await sendOtpEmail(email, otp, purpose);
  if (emailSent) return { success: true };

  await OTP.deleteMany({ email, otp, purpose });
  return {
    success: false,
    message: `We couldn't send the ${purpose === "password_reset" ? "password reset" : "verification"} email right now. Please try again in a moment.`,
  };
};
