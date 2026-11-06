import mongoose, { Document, Schema } from "mongoose";

export interface ILabAnalyte extends Document {
  code: string;
  name: string;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
  deltaPercent?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const labAnalyteSchema = new Schema<ILabAnalyte>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    unit: { type: String, required: true, trim: true, maxlength: 24 },
    referenceLow: { type: Number },
    referenceHigh: { type: Number },
    criticalLow: { type: Number },
    criticalHigh: { type: Number },
    deltaPercent: { type: Number, min: 1, max: 1000 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const LabAnalyte = mongoose.model<ILabAnalyte>(
  "LabAnalyte",
  labAnalyteSchema,
);
