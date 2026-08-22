import nodemailer from "nodemailer";
import { envConfig } from "../config/env";

const isSmtpConfigured = Boolean(envConfig.SMTP_USER && envConfig.SMTP_PASS);
const isGmailApiConfigured = Boolean(
  envConfig.GMAIL_CLIENT_ID &&
    envConfig.GMAIL_CLIENT_SECRET &&
    envConfig.GMAIL_REFRESH_TOKEN &&
    envConfig.GMAIL_USER
);

const encodeBase64Url = (value: string): string => {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const sendWithGmailApi = async (email: string, otp: string, html: string): Promise<void> => {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: envConfig.GMAIL_CLIENT_ID || "",
      client_secret: envConfig.GMAIL_CLIENT_SECRET || "",
      refresh_token: envConfig.GMAIL_REFRESH_TOKEN || "",
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    throw new Error(`Gmail token refresh failed with ${tokenResponse.status}: ${errorBody}`);
  }

  const tokenBody = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenBody.access_token) {
    throw new Error("Gmail token refresh response did not include an access token.");
  }

  const from = envConfig.GMAIL_FROM || `HealOS <${envConfig.GMAIL_USER}>`;
  const mimeMessage = [
    `From: ${from}`,
    `To: ${email}`,
    `Subject: [HealOS] Your Verification Code: ${otp}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");

  const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenBody.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encodeBase64Url(mimeMessage) }),
  });

  if (!sendResponse.ok) {
    const errorBody = await sendResponse.text();
    throw new Error(`Gmail API send failed with ${sendResponse.status}: ${errorBody}`);
  }
};

const sendWithResend = async (email: string, otp: string, html: string): Promise<void> => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${envConfig.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: envConfig.EMAIL_FROM,
      to: [email],
      subject: `[HealOS] Your Verification Code: ${otp}`,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API failed with ${response.status}: ${errorBody}`);
  }
};

const sendWithSmtp = async (email: string, otp: string, html: string): Promise<void> => {
  const secure = envConfig.SMTP_PORT === 465;
  const transporter = nodemailer.createTransport({
    host: envConfig.SMTP_HOST,
    port: envConfig.SMTP_PORT,
    secure,
    requireTLS: !secure,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    auth: {
      user: envConfig.SMTP_USER,
      pass: envConfig.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: envConfig.EMAIL_FROM,
    to: email,
    subject: `[HealOS] Your Verification Code: ${otp}`,
    html,
  });
};

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

    if (isGmailApiConfigured) {
      await sendWithGmailApi(email, otp, htmlContent);
      console.log(`✅ Verification OTP sent to ${email} via Gmail API`);
      return true;
    }

    if (envConfig.RESEND_API_KEY) {
      await sendWithResend(email, otp, htmlContent);
      console.log(`✅ Verification OTP sent to ${email} via Resend`);
      return true;
    }

    // If email credentials aren't set in dev, log to console as fallback
    if (!isSmtpConfigured) {
      if (envConfig.NODE_ENV === "production") {
        console.error(
          "❌ Email delivery is not configured. Set Gmail API, RESEND_API_KEY, or SMTP credentials."
        );
        return false;
      }

      console.log(`\n==========================================`);
      console.log(`📧 [DEV FALLBACK] OTP Code for ${email}: ${otp}`);
      console.log(`==========================================\n`);
      return true;
    }

    await sendWithSmtp(email, otp, htmlContent);

    console.log(`✅ Verification OTP sent to ${email} via SMTP`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error);

    if (envConfig.NODE_ENV !== "production") {
      // Print fallback OTP in console so development is never blocked by email provider errors
      console.log(`\n==========================================`);
      console.log(`📧 [DEV EMERGENCY FALLBACK] OTP Code for ${email}: ${otp}`);
      console.log(`==========================================\n`);
    }

    return false;
  }
};
