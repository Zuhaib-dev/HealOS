import mongoose, { Schema, Document } from "mongoose";

export interface IPatientProfile extends Document {
  user: mongoose.Types.ObjectId;
  dob?: string;
  gender?: "MALE" | "FEMALE";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";
  emergencyPhone?: string;
  emergencyContactName?: string;
  allergies?: string[];
  medicalHistory?: string;
  bio?: string;
  address?: string;
  height?: number;
  heightUnit?: "cm" | "ft";
  weight?: number; // in kg
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const patientProfileSchema = new Schema<IPatientProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    dob: { type: String },
    gender: { type: String, enum: ["MALE", "FEMALE"] },
    bloodGroup: { type: String, enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] },
    emergencyPhone: { type: String },
    emergencyContactName: { type: String },
    allergies: [{ type: String }],
    medicalHistory: { type: String },
    bio: { type: String },
    address: { type: String },
    height: { type: Number },
    heightUnit: { type: String, enum: ["cm", "ft"], default: "cm" },
    weight: { type: Number },
    isComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PatientProfile = mongoose.model<IPatientProfile>("PatientProfile", patientProfileSchema);
