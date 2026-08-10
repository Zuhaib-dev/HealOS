import mongoose, { Schema, Document } from "mongoose";

export interface IRadiologyBooking extends Document {
  time: string;
  room: string;
  patientName: string;
  study: string;
  state: "booked" | "open" | "blocked";
  createdAt: Date;
  updatedAt: Date;
}

const radiologyBookingSchema = new Schema<IRadiologyBooking>(
  {
    time: { type: String, required: true },
    room: { type: String, required: true },
    patientName: { type: String },
    study: { type: String },
    state: { type: String, enum: ["booked", "open", "blocked"], required: true },
  },
  { timestamps: true }
);

export const RadiologyBooking = mongoose.model<IRadiologyBooking>("RadiologyBooking", radiologyBookingSchema);
