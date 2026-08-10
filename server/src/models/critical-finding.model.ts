import mongoose, { Schema, Document } from "mongoose";

export interface ICriticalFinding extends Document {
  accession: string;
  patientName: string;
  finding: string;
  called: boolean;
  clinician: string;
  atTime: string;
  createdAt: Date;
  updatedAt: Date;
}

const criticalFindingSchema = new Schema<ICriticalFinding>(
  {
    accession: { type: String, required: true },
    patientName: { type: String, required: true },
    finding: { type: String, required: true },
    called: { type: Boolean, default: false },
    clinician: { type: String, required: true },
    atTime: { type: String, required: true },
  },
  { timestamps: true }
);

export const CriticalFinding = mongoose.model<ICriticalFinding>("CriticalFinding", criticalFindingSchema);
