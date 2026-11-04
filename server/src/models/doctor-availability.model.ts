import mongoose, { Schema, Document } from "mongoose";

export interface IDoctorAvailability extends Document {
  doctor: mongoose.Types.ObjectId;
  weekdays: number[]; // 0 = Sunday
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxPatientsPerDay: number;
  consultationFee: number;
  advanceFee: number;
  active: boolean;
}

const schema = new Schema<IDoctorAvailability>(
  {
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    weekdays: { type: [Number], default: [1, 2, 3, 4, 5] },
    startTime: { type: String, required: true, default: "09:00" },
    endTime: { type: String, required: true, default: "17:00" },
    slotDurationMinutes: { type: Number, min: 5, max: 240, default: 60 },
    maxPatientsPerDay: { type: Number, min: 1, max: 100, default: 8 },
    consultationFee: { type: Number, min: 0, default: 350 },
    advanceFee: { type: Number, min: 1, default: 20 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const DoctorAvailability = mongoose.model<IDoctorAvailability>(
  "DoctorAvailability",
  schema,
);
