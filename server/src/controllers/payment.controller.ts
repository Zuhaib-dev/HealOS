import { Request, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { z } from "zod";
import {
  Appointment,
  AppointmentStatus,
  Invoice,
  InvoicePaymentMethod,
  InvoiceStatus,
  PaymentStatus,
} from "../models/index.js";
import { AppError } from "../middleware/error-handler.js";
import { envConfig } from "../config/env.js";
import { getIO } from "../socket.js";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

const paymentTargetObjectSchema = z.object({
  appointmentId: objectIdSchema.optional(),
  invoiceId: objectIdSchema.optional(),
});
const paymentTargetSchema = paymentTargetObjectSchema.refine(
  (value) => Boolean(value.appointmentId) !== Boolean(value.invoiceId),
);

const verifyPaymentSchema = paymentTargetObjectSchema
  .extend({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i),
  })
  .refine((value) => Boolean(value.appointmentId) !== Boolean(value.invoiceId));

let razorpayClient: Razorpay | null = null;

function getRazorpayClient() {
  const keyId = envConfig.RAZORPAY_KEY_ID;
  const keySecret = envConfig.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new AppError("Online payments are not configured", 503);
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpayClient;
}

const rupeesToPaise = (amount: number) => Math.round(amount * 100);

function invoicePaidAmount(invoice: {
  paidAmount?: number;
  status: string;
  totalAmount: number;
  insuranceCoverage?: number;
}) {
  const paid = invoice.paidAmount || 0;
  // Older fully paid invoices predate the paidAmount field.
  if (invoice.status === InvoiceStatus.PAID) {
    return Math.max(
      paid,
      invoice.totalAmount - (invoice.insuranceCoverage || 0),
    );
  }
  return Math.max(0, paid);
}

function invoiceBalanceDue(invoice: {
  paidAmount?: number;
  status: string;
  totalAmount: number;
  insuranceCoverage?: number;
}) {
  if (invoice.status === InvoiceStatus.CANCELLED) return 0;
  return Math.max(
    0,
    invoice.totalAmount -
      (invoice.insuranceCoverage || 0) -
      invoicePaidAmount(invoice),
  );
}

function updateInvoiceStatus(invoice: InstanceType<typeof Invoice>) {
  const settled = invoicePaidAmount(invoice) + (invoice.insuranceCoverage || 0);
  invoice.status =
    settled >= invoice.totalAmount
      ? InvoiceStatus.PAID
      : settled > 0
        ? InvoiceStatus.PARTIAL
        : InvoiceStatus.PENDING;
}

function validSignature(orderId: string, paymentId: string, signature: string) {
  const secret = envConfig.RAZORPAY_KEY_SECRET;
  if (!secret) throw new AppError("Online payments are not configured", 503);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const provided = Buffer.from(signature, "hex");
  return (
    provided.length === expected.length &&
    crypto.timingSafeEqual(expected, provided)
  );
}

async function getOrCreateOrder(
  client: Razorpay,
  existingOrderId: string | undefined,
  amountPaise: number,
  receipt: string,
  notes: Record<string, string>,
) {
  if (existingOrderId) {
    const existing = await client.orders.fetch(existingOrderId);
    if (
      existing.currency !== "INR" ||
      Number(existing.amount) !== amountPaise
    ) {
      throw new AppError(
        "A payment for this balance is already being processed. Refresh and try again.",
        409,
      );
    }
    if (existing.status === "paid") {
      throw new AppError(
        "This payment was received and is awaiting confirmation. Refresh your billing page.",
        409,
      );
    }
    return existing;
  }

  return client.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
    notes,
  });
}

async function verifyCapturedPayment(
  client: Razorpay,
  orderId: string,
  paymentId: string,
  expectedAmountPaise: number,
) {
  const [order, payment] = await Promise.all([
    client.orders.fetch(orderId),
    client.payments.fetch(paymentId),
  ]);
  if (
    order.id !== orderId ||
    order.status !== "paid" ||
    order.currency !== "INR" ||
    Number(order.amount) !== expectedAmountPaise ||
    Number(order.amount_paid) < expectedAmountPaise ||
    payment.order_id !== orderId ||
    payment.currency !== "INR" ||
    Number(payment.amount) !== expectedAmountPaise ||
    payment.status !== "captured" ||
    payment.captured !== true
  ) {
    throw new AppError("The payment has not been captured for this balance", 409);
  }
  return payment;
}

function emitPaymentUpdates(invoiceId?: unknown, appointment?: InstanceType<typeof Appointment>) {
  const io = getIO();
  if (invoiceId) {
    io?.emit("invoice_paid", { invoiceId });
    io?.emit("invoice_updated", { invoiceId });
    io?.emit("admin:data_changed", { types: ["invoices", "billing"] });
    io?.emit("reception:overview_updated");
  }
  if (appointment) {
    io?.emit("appointment_updated", {
      appointmentId: appointment._id,
      doctorId: appointment.doctor,
      patientId: appointment.patient,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
    });
  }
}

export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const parsed = paymentTargetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Choose exactly one appointment or invoice to pay.",
      });
    }
    const patientId = req.user?._id;
    if (!patientId) throw new AppError("Authentication required", 401);
    const client = getRazorpayClient();
    let order: { id: string; amount: number; currency: string; status: string };

    if (parsed.data.appointmentId) {
      const appointment = await Appointment.findOne({
        _id: parsed.data.appointmentId,
        patient: patientId,
        paymentMethod: "ONLINE",
        paymentStatus: PaymentStatus.PENDING_ONLINE,
        status: AppointmentStatus.PENDING,
      });
      if (!appointment) {
        throw new AppError("Unpaid online appointment not found", 404);
      }
      const invoice = await Invoice.findOne({
        appointment: appointment._id,
        patient: patientId,
      });
      const linkedAppointment = invoice
        ? appointment
        : null;
      const appointmentBalance = Math.max(
        0,
        appointment.amount - (appointment.paidAmount || 0),
      );
      const amount = Math.min(
        appointment.advanceAmount || appointment.amount,
        appointmentBalance,
        invoice
          ? Math.max(
              0,
              invoice.totalAmount -
                (invoice.insuranceCoverage || 0) -
                Math.max(
                  invoicePaidAmount(invoice),
                  linkedAppointment?.paidAmount || 0,
                ),
            )
          : appointmentBalance,
      );
      const amountPaise = rupeesToPaise(amount);
      if (!amountPaise) throw new AppError("No appointment balance is due", 400);
      order = await getOrCreateOrder(
        client,
        appointment.razorpayOrderId,
        amountPaise,
        `appt-${String(appointment._id).slice(-12)}-${Date.now()}`,
        { appointmentId: String(appointment._id), patientId: String(patientId) },
      );
      appointment.razorpayOrderId = order.id;
      await appointment.save();
    } else {
      const invoice = await Invoice.findOne({
        _id: parsed.data.invoiceId,
        patient: patientId,
      });
      if (!invoice) throw new AppError("Invoice not found", 404);
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new AppError("This invoice has been cancelled", 409);
      }
      const linkedAppointment = invoice.appointment
        ? await Appointment.findOne({
            _id: invoice.appointment,
            patient: patientId,
          })
        : null;
      const amountPaise = rupeesToPaise(
        Math.max(
          0,
          invoice.totalAmount -
            (invoice.insuranceCoverage || 0) -
            Math.max(
              invoicePaidAmount(invoice),
              linkedAppointment?.paidAmount || 0,
            ),
        ),
      );
      if (!amountPaise) throw new AppError("This invoice has no balance due", 400);
      // A booking advance used to be stored as the invoice's current Razorpay
      // order too. Once its payment is recorded, that paid order must not block
      // a new order for the remaining invoice balance.
      const previousOrderWasApplied = Boolean(
        invoice.razorpayOrderId &&
          invoice.paymentHistory?.some(
            (payment) => payment.orderId === invoice.razorpayOrderId,
          ),
      );
      order = await getOrCreateOrder(
        client,
        previousOrderWasApplied ? undefined : invoice.razorpayOrderId,
        amountPaise,
        `inv-${String(invoice._id).slice(-12)}-${Date.now()}`,
        { invoiceId: String(invoice._id), patientId: String(patientId) },
      );
      invoice.razorpayOrderId = order.id;
      await invoice.save();
    }

    res.status(200).json({
      success: true,
      keyId: envConfig.RAZORPAY_KEY_ID,
      order,
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    res.status(error.statusCode || 502).json({
      success: false,
      message:
        error instanceof AppError
          ? error.message
          : "Could not create a payment order. Please try again.",
    });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const parsed = verifyPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment verification details.",
      });
    }
    const {
      appointmentId,
      invoiceId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = parsed.data;
    const patientId = req.user?._id;
    if (!patientId) throw new AppError("Authentication required", 401);
    if (!validSignature(orderId, paymentId, signature)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }
    const client = getRazorpayClient();

    if (appointmentId) {
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        patient: patientId,
        paymentMethod: "ONLINE",
      });
      if (!appointment) throw new AppError("Appointment not found", 404);
      const invoice = await Invoice.findOne({
        appointment: appointment._id,
        patient: patientId,
      });
      const alreadyApplied =
        (appointment.razorpayPaymentId === paymentId &&
          appointment.razorpayOrderId === orderId) ||
        Boolean(
          invoice?.paymentHistory?.some(
            (record) =>
              record.paymentId === paymentId && record.orderId === orderId,
          ),
        );
      if (alreadyApplied) {
        if (invoice)
          appointment.paidAmount = Math.max(
            appointment.paidAmount || 0,
            invoice.paidAmount || 0,
          );
        appointment.paymentStatus =
          appointment.paidAmount + (invoice?.insuranceCoverage || 0) >=
          appointment.amount
            ? PaymentStatus.PAID
            : PaymentStatus.PENDING_CASH;
        appointment.status = AppointmentStatus.CONFIRMED;
        await appointment.save();
        return res.status(200).json({
          success: true,
          message: "Payment was already applied to this appointment",
        });
      }
      if (appointment.razorpayOrderId !== orderId) {
        throw new AppError("Payment order does not belong to this appointment", 409);
      }
      if (
        appointment.paymentStatus !== PaymentStatus.PENDING_ONLINE ||
        appointment.status !== AppointmentStatus.PENDING
      ) {
        throw new AppError("This appointment is no longer awaiting payment", 409);
      }

      const appointmentBalance = Math.max(
        0,
        appointment.amount - (appointment.paidAmount || 0),
      );
      const amount = Math.min(
        appointment.advanceAmount || appointment.amount,
        appointmentBalance,
        invoice
          ? Math.max(
              0,
              invoice.totalAmount -
                (invoice.insuranceCoverage || 0) -
                Math.max(
                  invoicePaidAmount(invoice),
                  appointment.paidAmount || 0,
                ),
            )
          : appointmentBalance,
      );
      const expectedPaise = rupeesToPaise(amount);
      const payment = await verifyCapturedPayment(
        client,
        orderId,
        paymentId,
        expectedPaise,
      );
      const paidAmount = Number(payment.amount) / 100;

      if (invoice) {
        if (paidAmount > invoiceBalanceDue(invoice)) {
          throw new AppError("The invoice balance changed. Refresh and try again", 409);
        }
        invoice.paidAmount = Math.max(
          invoicePaidAmount(invoice),
          appointment.paidAmount || 0,
        ) + paidAmount;
        invoice.paymentHistory ??= [];
        invoice.paymentHistory.push({
          amount: paidAmount,
          method: InvoicePaymentMethod.CARD,
          source: "RAZORPAY",
          orderId,
          paymentId,
          paidAt: new Date(),
        });
        invoice.paymentMethod = InvoicePaymentMethod.CARD;
        invoice.paidAt = new Date();
        updateInvoiceStatus(invoice);
        await invoice.save();
      }

      appointment.paidAmount = (appointment.paidAmount || 0) + paidAmount;
      appointment.paymentStatus =
        appointment.paidAmount + (invoice?.insuranceCoverage || 0) >=
        appointment.amount
          ? PaymentStatus.PAID
          : PaymentStatus.PENDING_CASH;
      appointment.status = AppointmentStatus.CONFIRMED;
      appointment.razorpayPaymentId = paymentId;
      appointment.razorpaySignature = signature;
      await appointment.save();
      emitPaymentUpdates(invoice?._id, appointment);
    } else {
      const invoice = await Invoice.findOne({
        _id: invoiceId,
        patient: patientId,
      });
      if (!invoice) throw new AppError("Invoice not found", 404);
      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new AppError("This invoice has been cancelled", 409);
      }
      if (
        (invoice.razorpayPaymentId === paymentId &&
          invoice.razorpayOrderId === orderId) ||
        invoice.paymentHistory?.some(
          (record) =>
            record.paymentId === paymentId && record.orderId === orderId,
        )
      ) {
        if (invoice.appointment) {
          const appointment = await Appointment.findOne({
            _id: invoice.appointment,
            patient: patientId,
          });
          if (appointment) {
            appointment.paidAmount = Math.max(
              appointment.paidAmount || 0,
              invoice.paidAmount || 0,
            );
            appointment.paymentStatus =
              appointment.paidAmount + (invoice.insuranceCoverage || 0) >=
              appointment.amount
                ? PaymentStatus.PAID
                : PaymentStatus.PENDING_CASH;
            await appointment.save();
          }
        }
        return res.status(200).json({
          success: true,
          message: "Payment was already applied to this invoice",
        });
      }
      if (invoice.razorpayOrderId !== orderId) {
        throw new AppError("Payment order does not belong to this invoice", 409);
      }
      const linkedAppointment = invoice.appointment
        ? await Appointment.findOne({
            _id: invoice.appointment,
            patient: patientId,
          })
        : null;
      const due = Math.max(
        0,
        invoice.totalAmount -
          (invoice.insuranceCoverage || 0) -
          Math.max(
            invoicePaidAmount(invoice),
            linkedAppointment?.paidAmount || 0,
          ),
      );
      const expectedPaise = rupeesToPaise(due);
      if (!expectedPaise) throw new AppError("This invoice has no balance due", 409);
      const payment = await verifyCapturedPayment(
        client,
        orderId,
        paymentId,
        expectedPaise,
      );
      const paidAmount = Number(payment.amount) / 100;
      invoice.paidAmount =
        Math.max(
          invoicePaidAmount(invoice),
          linkedAppointment?.paidAmount || 0,
        ) + paidAmount;
      invoice.paymentHistory ??= [];
      invoice.paymentHistory.push({
        amount: paidAmount,
        method: InvoicePaymentMethod.CARD,
        source: "RAZORPAY",
        orderId,
        paymentId,
        paidAt: new Date(),
      });
      invoice.paymentMethod = InvoicePaymentMethod.CARD;
      invoice.paidAt = new Date();
      invoice.razorpayPaymentId = paymentId;
      invoice.razorpaySignature = signature;
      updateInvoiceStatus(invoice);
      await invoice.save();

      let appointment: InstanceType<typeof Appointment> | null = null;
      if (invoice.appointment) {
        appointment = await Appointment.findOne({
          _id: invoice.appointment,
          patient: patientId,
        });
        if (appointment) {
          appointment.paidAmount = Math.max(
            appointment.paidAmount || 0,
            invoice.paidAmount,
          );
          appointment.paymentStatus =
            appointment.paidAmount + (invoice.insuranceCoverage || 0) >=
            appointment.amount
              ? PaymentStatus.PAID
              : PaymentStatus.PENDING_CASH;
          await appointment.save();
        }
      }
      emitPaymentUpdates(invoice._id, appointment || undefined);
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    res.status(error.statusCode || 502).json({
      success: false,
      message:
        error instanceof AppError
          ? error.message
          : "Could not verify the payment. Please refresh your billing page.",
    });
  }
};
