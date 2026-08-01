import mongoose, { Schema, Document } from "mongoose";

export interface IPatientProfile extends Document {
  user: mongoose.Types.ObjectId;
  dob?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";
  emergencyPhone?: string;
  emergencyContactName?: string;
  allergies?: string[];
  medicalHistory?: string;
  address?: string;
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const patientProfileSchema = new Schema<IPatientProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    dob: { type: String },
    gender: { type: String, enum: ["MALE", "FEMALE", "OTHER"] },
    bloodGroup: { type: String, enum: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] },
    emergencyPhone: { type: String },
    emergencyContactName: { type: String },
    allergies: [{ type: String }],
    medicalHistory: { type: String },
    address: { type: String },
    isComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PatientProfile = mongoose.model<IPatientProfile>("PatientProfile", patientProfileSchema);
