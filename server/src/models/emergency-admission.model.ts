import mongoose, { Document, Schema } from "mongoose";

export type EmergencyAdmissionStatus = "ACTIVE" | "DISCHARGED" | "TRANSFERRED";

export interface IEmergencyAdmission extends Document {
  emergencyCase: mongoose.Types.ObjectId;
  ward: mongoose.Types.ObjectId;
  admittedBy: mongoose.Types.ObjectId;
  patientName: string;
  diagnosis: string;
  reason: string;
  status: EmergencyAdmissionStatus;
  admittedAt: Date;
  dischargedAt?: Date;
  dischargeNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyAdmissionSchema = new Schema<IEmergencyAdmission>(
  {
    emergencyCase: {
      type: Schema.Types.ObjectId,
      ref: "EmergencyCase",
      required: true,
      unique: true,
    },
    ward: { type: Schema.Types.ObjectId, ref: "Ward", required: true },
    admittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    patientName: { type: String, required: true, trim: true },
    diagnosis: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["ACTIVE", "DISCHARGED", "TRANSFERRED"],
      default: "ACTIVE",
      required: true,
    },
    admittedAt: { type: Date, default: Date.now, required: true },
    dischargedAt: { type: Date },
    dischargeNote: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

emergencyAdmissionSchema.index({ status: 1, admittedAt: -1 });

export const EmergencyAdmission = mongoose.model<IEmergencyAdmission>(
  "EmergencyAdmission",
  emergencyAdmissionSchema,
);
