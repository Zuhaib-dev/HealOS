import mongoose, { Schema, Document } from "mongoose";

export type ResusBayState = "occupied" | "ready" | "cleaning" | "maintenance";

export interface IResusBay extends Document {
  bayId: string;
  state: ResusBayState;
  patientSummary: string;
  team: string;
  occupiedAt?: Date;
  clockDisplay?: string;
  airway: string;
  lines: string;
  nextIntervention: string;
  createdAt: Date;
  updatedAt: Date;
}

const resusBaySchema = new Schema<IResusBay>(
  {
    bayId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      enum: ["occupied", "ready", "cleaning", "maintenance"],
      default: "ready",
      index: true,
    },
    patientSummary: {
      type: String,
      default: "—",
      trim: true,
    },
    team: {
      type: String,
      default: "—",
      trim: true,
    },
    occupiedAt: {
      type: Date,
    },
    clockDisplay: {
      type: String,
      trim: true,
    },
    airway: {
      type: String,
      default: "trolley checked",
      trim: true,
    },
    lines: {
      type: String,
      default: "—",
      trim: true,
    },
    nextIntervention: {
      type: String,
      default: "Available",
      trim: true,
    },
  },
  { timestamps: true }
);

export const ResusBay = mongoose.model<IResusBay>("ResusBay", resusBaySchema);
