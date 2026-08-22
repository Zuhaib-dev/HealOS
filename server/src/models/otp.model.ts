import mongoose, { Schema, Document } from "mongoose";

export interface IOTP extends Document {
  email: string;
  otp: string;
  purpose: "email_verification" | "password_reset";
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    otp: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["email_verification", "password_reset"],
      default: "email_verification",
      required: true,
    },
    createdAt: { type: Date, default: Date.now, expires: 600 }, // Automatically deletes after 10 minutes (600s)
  }
);

otpSchema.index({ email: 1, purpose: 1 });

export const OTP = mongoose.model<IOTP>("OTP", otpSchema);
