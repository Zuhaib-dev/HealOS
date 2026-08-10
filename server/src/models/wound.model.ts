import mongoose, { Schema, Document } from "mongoose";

export interface IWound extends Document {
  patient: string;
  bed: string;
  site: string;
  type: string;
  stage: string;
  size: string;
  exudate: "nil" | "low" | "moderate" | "high";
  dressing: string;
  lastChange: string;
  nextChange: string;
  healing: number[];
  photoNote: string;
  overdue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const woundSchema = new Schema(
  {
    patient: { type: String, required: true },
    bed: { type: String, required: true },
    site: { type: String, required: true },
    type: { type: String, required: true },
    stage: { type: String, required: true },
    size: { type: String, required: true },
    exudate: { type: String, enum: ["nil", "low", "moderate", "high"], default: "nil" },
    dressing: { type: String, required: true },
    lastChange: { type: String, required: true },
    nextChange: { type: String, required: true },
    healing: { type: [Number], default: [] },
    photoNote: { type: String },
    overdue: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Wound = mongoose.model<IWound>("Wound", woundSchema);
