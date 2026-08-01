import mongoose, { Schema, Document } from "mongoose";

export interface IOTP extends Document {
  email: string;
  otp: string;
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 600 }, // Automatically deletes after 10 minutes (600s)
  }
);

otpSchema.index({ email: 1 });

export const OTP = mongoose.model<IOTP>("OTP", otpSchema);
