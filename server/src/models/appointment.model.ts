import mongoose, { Schema, Document } from "mongoose";

export enum AppointmentStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  IN_PROGRESS = "IN_PROGRESS",
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
  timeSlot: string; // Stored as sortable 24-hour HH:mm; formatted for display by the client.
  queueNumber?: number;
  reason: string;
  type: AppointmentType;
  status: AppointmentStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: number;
  advanceAmount?: number;
  paidAmount?: number;
  arrivalTime?: string;
  slotEndTime?: string;
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
    queueNumber: { type: Number, min: 1 },
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
    advanceAmount: { type: Number, default: 20 },
    paidAmount: { type: Number, default: 0 },
    arrivalTime: { type: String },
    slotEndTime: { type: String },
    bookedAt: { type: Date, default: Date.now },
    notes: { type: String },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
  },
  { timestamps: true },
);

appointmentSchema.index({ patient: 1, date: 1 });
appointmentSchema.index({ doctor: 1, date: 1 });
appointmentSchema.index({ status: 1, date: 1 });
appointmentSchema.index(
  { doctor: 1, date: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "CANCELLED" } } },
);
appointmentSchema.index(
  { doctor: 1, date: 1, queueNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      queueNumber: { $type: "number" },
    },
  },
);

export const Appointment = mongoose.model<IAppointment>(
  "Appointment",
  appointmentSchema,
);
