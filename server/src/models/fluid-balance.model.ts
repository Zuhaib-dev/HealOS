import mongoose, { Schema, Document } from "mongoose";

export interface IFluidBalance extends Document {
  patient: string;
  bed: string;
  intakeOral: number;
  intakeIV: number;
  outputUrine: number;
  outputDrain: number;
  target: number;
  restriction?: number;
  createdAt: Date;
  updatedAt: Date;
}

const fluidBalanceSchema = new Schema(
  {
    patient: { type: String, required: true },
    bed: { type: String, required: true },
    intakeOral: { type: Number, default: 0 },
    intakeIV: { type: Number, default: 0 },
    outputUrine: { type: Number, default: 0 },
    outputDrain: { type: Number, default: 0 },
    target: { type: Number, required: true },
    restriction: { type: Number },
  },
  { timestamps: true }
);

export const FluidBalance = mongoose.model<IFluidBalance>("FluidBalance", fluidBalanceSchema);
