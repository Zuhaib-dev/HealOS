import nodemailer from "nodemailer";
import { envConfig } from "../config/env";

const transporter = nodemailer.createTransport({
  host: envConfig.SMTP_HOST || "smtp.gmail.com",
  port: envConfig.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: envConfig.SMTP_USER,
    pass: envConfig.SMTP_PASS,
  },
});

export const sendOtpEmail = async (email: string, otp: string): Promise<boolean> => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
          <h1 style="color: #0d9488; margin: 0; font-size: 28px;">HealOS</h1>
          <p style="color: #666666; margin: 5px 0 0 0; font-size: 14px;">Operating System for Healthcare</p>
        </div>
        <div style="padding: 30px 0; text-align: center;">
          <h2 style="color: #333333; margin-top: 0;">Email Verification Code</h2>
          <p style="color: #666666; font-size: 16px; line-height: 1.5;">Please use the 6-digit verification code below to complete your registration or login:</p>
          <div style="margin: 25px 0; padding: 15px; background-color: #f0fdf4; border: 1px dashed #0d9488; border-radius: 6px; display: inline-block;">
            <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f766e;">${otp}</span>
          </div>
          <p style="color: #999999; font-size: 13px; margin-bottom: 0;">This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        </div>
        <div style="padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999999; font-size: 12px;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} HealOS. All rights reserved.</p>
        </div>
      </div>
    `;

    // If SMTP credentials aren't set in dev, log to console as fallback
    if (!envConfig.SMTP_USER || !envConfig.SMTP_PASS) {
      console.log(`\n==========================================`);
      console.log(`📧 [DEV FALLBACK] OTP Code for ${email}: ${otp}`);
      console.log(`==========================================\n`);
      return true;
    }

    await transporter.sendMail({
      from: envConfig.EMAIL_FROM || '"HealOS Support" <noreply@healos.com>',
      to: email,
      subject: `[HealOS] Your Verification Code: ${otp}`,
      html: htmlContent,
    });

    console.log(`✅ Verification OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error);
    // Print fallback OTP in console so development is never blocked by SMTP errors
    console.log(`\n==========================================`);
    console.log(`📧 [DEV EMERGENCY FALLBACK] OTP Code for ${email}: ${otp}`);
    console.log(`==========================================\n`);
    return false;
  }
};
