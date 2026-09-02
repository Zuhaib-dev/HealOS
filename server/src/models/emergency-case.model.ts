import mongoose, { Schema, Document } from "mongoose";

export type EsiLevel = 1 | 2 | 3 | 4 | 5;

export type EmergencyDisposition =
  | "awaiting triage"
  | "in bay"
  | "awaiting bed"
  | "for discharge"
  | "admitted"
  | "transferred"
  | "deceased";

export interface IEmergencyCase extends Document {
  caseId: string;
  patientName: string;
  patientRef?: mongoose.Types.ObjectId;
  age: number;
  sex: "M" | "F" | "O";
  presentingComplaint: string;
  esi: EsiLevel;
  arrivedAt: Date;
  area: string;
  observations: string;
  disposition: EmergencyDisposition;
  assignedDoctor?: mongoose.Types.ObjectId;
  assignedDoctorName?: string;
  triageNotes?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyCaseSchema = new Schema<IEmergencyCase>(
  {
    caseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    patientRef: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    age: {
      type: Number,
      required: true,
      min: 0,
      max: 130,
    },
    sex: {
      type: String,
      enum: ["M", "F", "O"],
      required: true,
    },
    presentingComplaint: {
      type: String,
      required: true,
      trim: true,
    },
    esi: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5],
      default: 3,
      index: true,
    },
    arrivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    area: {
      type: String,
      required: true,
      default: "Waiting",
      trim: true,
    },
    observations: {
      type: String,
      default: "obs pending",
      trim: true,
    },
    disposition: {
      type: String,
      enum: [
        "awaiting triage",
        "in bay",
        "awaiting bed",
        "for discharge",
        "admitted",
        "transferred",
        "deceased",
      ],
      default: "awaiting triage",
      index: true,
    },
    assignedDoctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedDoctorName: {
      type: String,
      trim: true,
    },
    triageNotes: {
      type: String,
      trim: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

export const EmergencyCase = mongoose.model<IEmergencyCase>(
  "EmergencyCase",
  emergencyCaseSchema
);
