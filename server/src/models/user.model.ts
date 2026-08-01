import mongoose, { Schema, Document } from "mongoose";

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  DOCTOR = "DOCTOR",
  RADIOLOGIST = "RADIOLOGIST",
  RECEPTIONIST = "RECEPTIONIST",
}

export interface IUser extends Document {
  name: string;
  email: string;
  googleId?: string;
  password?: string;
  phone?: string;
  role: UserRole;
  isEmailVerified: boolean;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleId: { type: String, unique: true, sparse: true },
    password: { type: String }, // Optional if logged in via Google
    phone: { type: String, trim: true },
    role: { 
      type: String, 
      enum: Object.values(UserRole), 
      default: UserRole.USER 
    },
    isEmailVerified: { type: Boolean, default: false },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

// Indexes for faster querying
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

export const User = mongoose.model<IUser>("User", userSchema);
