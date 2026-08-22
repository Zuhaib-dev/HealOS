import { Request, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { Appointment, Invoice } from "../models/index.js";
import { AppError } from "../middleware/error-handler.js";
import { getIO } from "../socket.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_V0P16tZ8KXX30y",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "8xU95oYtK0O058J5N1O8T72P",
});

export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const { amount, receipt } = req.body; // Amount should be in INR

    if (!amount) {
      throw new AppError("Amount is required", 400);
    }

    const options = {
      amount: amount * 100, // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: receipt || `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    res.status(200).json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create Razorpay order",
    });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentId, invoiceId } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || "8xU95oYtK0O058J5N1O8T72P";

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // Update Appointment
    if (appointmentId) {
      const appointment = await Appointment.findById(appointmentId);
      if (appointment) {
        appointment.paymentStatus = "PAID" as any;
        appointment.razorpayOrderId = razorpay_order_id;
        appointment.razorpayPaymentId = razorpay_payment_id;
        appointment.razorpaySignature = razorpay_signature;
        await appointment.save();
      }
    }

    // Update Invoice
    if (invoiceId) {
      const invoice = await Invoice.findById(invoiceId);
      if (invoice) {
        invoice.status = "PAID" as any;
        invoice.paidAt = new Date();
        invoice.razorpayOrderId = razorpay_order_id;
        invoice.razorpayPaymentId = razorpay_payment_id;
        invoice.razorpaySignature = razorpay_signature;
        
        // Also update appointment if linked to invoice and not passed explicitly
        if (invoice.appointment && !appointmentId) {
          const appt = await Appointment.findById(invoice.appointment);
          if (appt) {
            appt.paymentStatus = "PAID" as any;
            appt.razorpayOrderId = razorpay_order_id;
            appt.razorpayPaymentId = razorpay_payment_id;
            appt.razorpaySignature = razorpay_signature;
            await appt.save();
          }
        }
        await invoice.save();
        
        const io = getIO();
        if (io) {
          io.emit("invoice_paid", { invoiceId: invoice._id });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed",
    });
  }
};
