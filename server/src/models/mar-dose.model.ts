import mongoose, { Schema, Document } from "mongoose";

export interface IMarDose extends Document {
  patient: string;
  bed: string;
  drug: string;
  dose: string;
  route: "PO" | "IV" | "IM" | "SC" | "NEB" | "TOP";
  time: string;
  window: string;
  state: "due" | "overdue" | "given" | "held" | "refused";
  highAlert: boolean;
  controlled: boolean;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const marDoseSchema = new Schema(
  {
    patient: { type: String, required: true },
    bed: { type: String, required: true },
    drug: { type: String, required: true },
    dose: { type: String, required: true },
    route: { type: String, enum: ["PO", "IV", "IM", "SC", "NEB", "TOP"], required: true },
    time: { type: String, required: true },
    window: { type: String, required: true },
    state: { type: String, enum: ["due", "overdue", "given", "held", "refused"], default: "due" },
    highAlert: { type: Boolean, default: false },
    controlled: { type: Boolean, default: false },
    note: { type: String },
  },
  { timestamps: true }
);

export const MarDose = mongoose.model<IMarDose>("MarDose", marDoseSchema);
