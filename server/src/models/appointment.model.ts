import mongoose, { Schema, Document } from "mongoose";

export enum AppointmentStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum AppointmentType {
  IN_PERSON = "IN_PERSON",
  TELECONSULT = "TELECONSULT",
  EMERGENCY = "EMERGENCY",
}

export enum PaymentMethod {
  ONLINE = "ONLINE",
  CASH = "CASH",
}

export enum PaymentStatus {
  PAID = "PAID",
  PENDING_CASH = "PENDING_CASH",
  PENDING_ONLINE = "PENDING_ONLINE",
  REFUNDED = "REFUNDED",
}

export interface IAppointment extends Document {
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  department: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:00 AM"
  reason: string;
  type: AppointmentType;
  status: AppointmentStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: number;
  bookedAt: Date;
  notes?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    reason: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(AppointmentType),
      default: AppointmentType.IN_PERSON,
    },
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.PENDING,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
      default: PaymentMethod.CASH,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true,
      default: PaymentStatus.PENDING_CASH,
    },
    amount: { type: Number, required: true, default: 400 },
    bookedAt: { type: Date, default: Date.now },
    notes: { type: String },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
  },
  { timestamps: true }
);

appointmentSchema.index({ patient: 1, date: 1 });
appointmentSchema.index({ doctor: 1, date: 1 });

export const Appointment = mongoose.model<IAppointment>("Appointment", appointmentSchema);
