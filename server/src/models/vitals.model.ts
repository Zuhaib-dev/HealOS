import mongoose, { Schema, Document } from "mongoose";

export interface IVitals extends Document {
  patient: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  recordedBy: mongoose.Types.ObjectId; // The Nurse
  heartRate?: number;       // bpm
  respiratoryRate?: number; // breaths/min
  spo2?: number;            // %
  temperature?: number;     // °C
  bloodPressure?: string;   // e.g. "120/80"
  weight?: number;          // kg
  height?: number;          // cm
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const vitalsSchema = new Schema<IVitals>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    heartRate: { type: Number },
    respiratoryRate: { type: Number },
    spo2: { type: Number },
    temperature: { type: Number },
    bloodPressure: { type: String },
    weight: { type: Number },
    height: { type: Number },
    notes: { type: String },
  },
  { timestamps: true }
);

vitalsSchema.index({ patient: 1, createdAt: -1 });
vitalsSchema.index({ appointment: 1 });

export const Vitals = mongoose.model<IVitals>("Vitals", vitalsSchema);
