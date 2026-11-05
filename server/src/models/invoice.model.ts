import mongoose, { Schema, Document } from "mongoose";

export enum InvoiceStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  PARTIAL = "PARTIAL",
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

export interface IInvoicePayment {
  amount: number;
  method: InvoicePaymentMethod;
  source: "RAZORPAY" | "RECEPTION";
  orderId?: string;
  paymentId?: string;
  recordedBy?: mongoose.Types.ObjectId;
  paidAt: Date;
}

export interface IInvoice extends Document {
  patient: mongoose.Types.ObjectId;
  issuedBy: mongoose.Types.ObjectId; // User who generated the invoice
  appointment?: mongoose.Types.ObjectId; // Optional link to an appointment
  items: IInvoiceItem[];
  totalAmount: number;
  paidAmount?: number;
  paymentHistory?: IInvoicePayment[];
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
    paidAmount: { type: Number, min: 0, default: 0 },
    paymentHistory: {
      type: [
        new Schema<IInvoicePayment>(
          {
            amount: { type: Number, min: 0.01, required: true },
            method: {
              type: String,
              enum: Object.values(InvoicePaymentMethod),
              required: true,
            },
            source: { type: String, enum: ["RAZORPAY", "RECEPTION"], required: true },
            orderId: { type: String },
            paymentId: { type: String },
            recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
            paidAt: { type: Date, required: true, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
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
  { timestamps: true },
);

invoiceSchema.index({ patient: 1, status: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });

export const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);
