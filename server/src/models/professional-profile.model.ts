import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "./user.model";

export enum ProfileStatus {
  PENDING = "PENDING",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface IProfessionalProfile extends Document {
  user: mongoose.Types.ObjectId;
  requestedRole: UserRole;
  degree: string;
  specialization: string;
  experienceYears: number;
  licenseNumber: string;
  department?: string;
  bio?: string;
  documentUrls: string[]; // URLs from ImageKit
  status: ProfileStatus;
  rejectionReason?: string;
  onboardingStep: number;
  reviewedBy?: mongoose.Types.ObjectId; // Admin who reviewed
  createdAt: Date;
  updatedAt: Date;
}

const professionalProfileSchema = new Schema<IProfessionalProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedRole: { 
      type: String, 
      enum: [UserRole.DOCTOR, UserRole.RADIOLOGIST], 
      required: true 
    },
    degree: { type: String, required: true },
    specialization: { type: String, required: true },
    experienceYears: { type: Number, required: true },
    licenseNumber: { type: String, required: true },
    department: { type: String },
    bio: { type: String },
    documentUrls: [{ type: String }],
    status: { 
      type: String, 
      enum: Object.values(ProfileStatus), 
      default: ProfileStatus.PENDING 
    },
    rejectionReason: { type: String },
    onboardingStep: { type: Number, default: 1 }, // Used by frontend to track multi-step forms
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const ProfessionalProfile = mongoose.model<IProfessionalProfile>(
  "ProfessionalProfile", 
  professionalProfileSchema
);
