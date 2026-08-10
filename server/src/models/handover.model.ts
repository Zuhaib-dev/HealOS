import mongoose, { Schema, Document } from "mongoose";

export interface IHandover extends Document {
  patient: mongoose.Types.ObjectId;
  patientName?: string; // added for nurse UI
  bed?: string; // added for nurse UI
  fromDoctor: mongoose.Types.ObjectId;
  toDoctor?: mongoose.Types.ObjectId;
  department?: string;
  acuity: "critical" | "guarded" | "stable";
  situation?: string; // added for SBAR
  background: string;
  assessment: string;
  recommendation?: string; // added for SBAR
  tasks: string[];
  status: "PENDING" | "ACKNOWLEDGED" | "COMPLETED";
  createdAt: Date;
  updatedAt: Date;
}

const handoverSchema = new Schema<IHandover>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    patientName: { type: String },
    bed: { type: String },
    fromDoctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toDoctor: { type: Schema.Types.ObjectId, ref: "User" },
    department: { type: String },
    acuity: { 
      type: String, 
      enum: ["critical", "guarded", "stable"],
      default: "stable" 
    },
    situation: { type: String },
    background: { type: String, required: true },
    assessment: { type: String, required: true },
    recommendation: { type: String },
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
