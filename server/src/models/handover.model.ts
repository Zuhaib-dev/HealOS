import mongoose, { Schema, Document } from "mongoose";

export interface IHandover extends Document {
  patient: mongoose.Types.ObjectId;
  fromDoctor: mongoose.Types.ObjectId;
  toDoctor?: mongoose.Types.ObjectId; // Optional: if assigned to a specific doctor
  department?: string; // Optional: if assigned to a department
  acuity: "critical" | "guarded" | "stable";
  background: string;
  assessment: string;
  tasks: string[]; // pending tasks
  status: "PENDING" | "ACKNOWLEDGED" | "COMPLETED";
  createdAt: Date;
  updatedAt: Date;
}

const handoverSchema = new Schema<IHandover>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fromDoctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toDoctor: { type: Schema.Types.ObjectId, ref: "User" },
    department: { type: String },
    acuity: { 
      type: String, 
      enum: ["critical", "guarded", "stable"],
      default: "stable" 
    },
    background: { type: String, required: true },
    assessment: { type: String, required: true },
    tasks: { type: [String], default: [] },
    status: { 
      type: String, 
      enum: ["PENDING", "ACKNOWLEDGED", "COMPLETED"],
      default: "PENDING"
    },
  },
  { timestamps: true }
);

handoverSchema.index({ toDoctor: 1, status: 1 });
handoverSchema.index({ department: 1, status: 1 });

export const Handover = mongoose.model<IHandover>("Handover", handoverSchema);
