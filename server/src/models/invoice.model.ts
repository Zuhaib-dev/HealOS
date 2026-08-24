import mongoose, { Schema, Document } from "mongoose";

export enum InvoiceStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export enum InvoicePaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  UPI = "UPI",
  INSURANCE = "INSURANCE",
}

export interface IInvoiceItem {
  description: string;
  amount: number;
}

export interface IInvoice extends Document {
  patient: mongoose.Types.ObjectId;
  issuedBy: mongoose.Types.ObjectId; // User who generated the invoice
  appointment?: mongoose.Types.ObjectId; // Optional link to an appointment
  items: IInvoiceItem[];
  totalAmount: number;
  status: InvoiceStatus;
  paymentMethod?: InvoicePaymentMethod;
  payer: string; // "self", "insurance", "corporate"
  insuranceCoverage?: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    patient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
    items: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.PENDING,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(InvoicePaymentMethod),
    },
    payer: {
      type: String,
      required: true,
      default: "self",
    },
    insuranceCoverage: { type: Number, default: 0 },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

invoiceSchema.index({ patient: 1, status: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });

export const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);
