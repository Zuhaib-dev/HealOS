import mongoose, { Schema, Document } from "mongoose";

export interface IWard extends Document {
  name: string;
  code: string;
  capacity: number;
  currentOccupancy: number;
  department: string;
  createdAt: Date;
  updatedAt: Date;
}

const wardSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    capacity: { type: Number, required: true },
    currentOccupancy: { type: Number, default: 0 },
    department: { type: String, required: true, default: "General" },
  },
  { timestamps: true }
);

export const Ward = mongoose.model<IWard>("Ward", wardSchema);
