import mongoose, { Schema, Document } from "mongoose";

export interface ICallBell extends Document {
  patient: string;
  bed: string;
  type: "call bell" | "bathroom" | "pain" | "IV alarm" | "emergency";
  raised: string; // e.g. "13:58"
  waitedSec: number;
  state: "waiting" | "accepted" | "closed";
  acceptedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const callBellSchema = new Schema(
  {
    patient: { type: String, required: true },
    bed: { type: String, required: true },
    type: { type: String, enum: ["call bell", "bathroom", "pain", "IV alarm", "emergency"], required: true },
    raised: { type: String, required: true },
    waitedSec: { type: Number, default: 0 },
    state: { type: String, enum: ["waiting", "accepted", "closed"], default: "waiting" },
    acceptedBy: { type: String },
  },
  { timestamps: true }
);

export const CallBell = mongoose.model<ICallBell>("CallBell", callBellSchema);
