import mongoose, { Schema, Document } from "mongoose";

export interface ISchedule extends Document {
  user: mongoose.Types.ObjectId; // Doctor or other staff
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  shiftType: "REGULAR" | "ON_CALL" | "LEAVE";
  department?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    shiftType: { 
      type: String, 
      enum: ["REGULAR", "ON_CALL", "LEAVE"],
      default: "REGULAR"
    },
    department: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

scheduleSchema.index({ user: 1, date: 1 });
scheduleSchema.index({ date: 1, department: 1 });

export const Schedule = mongoose.model<ISchedule>("Schedule", scheduleSchema);
