import {
  DiagnosticOrder,
  Invoice,
  InvoicePaymentMethod,
  InvoiceStatus,
} from "../models/index.js";
import { getIO } from "../socket.js";

export async function createOrGetDiagnosticInvoice(
  order: InstanceType<typeof DiagnosticOrder>,
  issuedBy: unknown,
  price: unknown,
) {
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    throw Object.assign(
      new Error("Enter a valid service price between ₹1 and ₹10,00,000"),
      { statusCode: 400 },
    );
  }
  if (order.invoice) {
    const existing = await Invoice.findById(order.invoice);
    if (existing) return existing;
  }
  if (!order.patient && !order.emergencyCase) {
    throw Object.assign(
      new Error("Diagnostic order has no patient or ED case"),
      { statusCode: 409 },
    );
  }
  const linked = await Invoice.findOne({ diagnosticOrder: order._id });
  if (linked) {
    order.invoice = linked._id;
    await order.save();
    return linked;
  }
  try {
    const invoice = await Invoice.create({
      ...(order.patient ? { patient: order.patient } : {}),
      ...(order.emergencyCase ? { emergencyCase: order.emergencyCase } : {}),
      issuedBy,
      diagnosticOrder: order._id,
      items: [{ description: order.testName, amount }],
      totalAmount: amount,
      paidAmount: 0,
      status: InvoiceStatus.PENDING,
      payer: "self",
      insuranceCoverage: 0,
    });
    order.invoice = invoice._id;
    await order.save();
    const io = getIO();
    const invoiceId = invoice._id;
    if (order.patient)
      io.to(`user:${order.patient}`).emit("invoice_updated", { invoiceId });
    io.to("admin").emit("invoice_created", { invoiceId });
    io.to("receptionist").emit("invoice_created", { invoiceId });
    return invoice;
  } catch (error: any) {
    if (error?.code === 11000) {
      const duplicate = await Invoice.findOne({ diagnosticOrder: order._id });
      if (duplicate) return duplicate;
    }
    throw error;
  }
}

export async function recordDiagnosticCashPayment(
  orderId: string,
  recordedBy: unknown,
) {
  const order = await DiagnosticOrder.findById(orderId);
  if (!order)
    throw Object.assign(new Error("Diagnostic order not found"), {
      statusCode: 404,
    });
  if (!order.invoice)
    throw Object.assign(
      new Error("Create the patient invoice before recording cash"),
      { statusCode: 409 },
    );
  const paidAt = new Date();
  const invoice = await Invoice.findOneAndUpdate(
    {
      _id: order.invoice,
      status: { $in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL] },
      $expr: {
        $lt: [
          {
            $add: [
              { $ifNull: ["$paidAmount", 0] },
              { $ifNull: ["$insuranceCoverage", 0] },
            ],
          },
          "$totalAmount",
        ],
      },
    },
    [
      {
        $set: {
          paidAmount: {
            $subtract: ["$totalAmount", { $ifNull: ["$insuranceCoverage", 0] }],
          },
          status: InvoiceStatus.PAID,
          paymentMethod: InvoicePaymentMethod.CASH,
          paidAt,
          paymentHistory: {
            $concatArrays: [
              { $ifNull: ["$paymentHistory", []] },
              [
                {
                  amount: {
                    $subtract: [
                      "$totalAmount",
                      {
                        $add: [
                          { $ifNull: ["$paidAmount", 0] },
                          { $ifNull: ["$insuranceCoverage", 0] },
                        ],
                      },
                    ],
                  },
                  method: InvoicePaymentMethod.CASH,
                  source: "RECEPTION",
                  recordedBy,
                  paidAt,
                },
              ],
            ],
          },
        },
      },
    ],
    { new: true },
  );
  const currentInvoice = invoice || (await Invoice.findById(order.invoice));
  if (
    !currentInvoice ||
    currentInvoice.status !== InvoiceStatus.PAID ||
    (currentInvoice.paidAmount || 0) + (currentInvoice.insuranceCoverage || 0) <
      currentInvoice.totalAmount
  ) {
    throw Object.assign(
      new Error("Invoice must be fully paid before starting this order"),
      { statusCode: 409 },
    );
  }
  const io = getIO();
  io.to(`user:${currentInvoice.patient}`).emit("invoice_paid", {
    invoiceId: currentInvoice._id,
  });
  io.to(`user:${currentInvoice.patient}`).emit("invoice_updated", {
    invoiceId: currentInvoice._id,
  });
  io.to("receptionist").emit("invoice_updated", {
    invoiceId: currentInvoice._id,
  });
  io.to(order.testType === "PATHOLOGY" ? "lab_technician" : "radiologist").emit(
    "invoice_paid",
    { invoiceId: currentInvoice._id },
  );
  io.to("admin").emit("admin:data_changed", { types: ["invoices", "billing"] });
  return currentInvoice;
}
