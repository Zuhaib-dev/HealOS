import { Request, Response } from "express";
import { User, UserRole, PatientProfile } from "../models/index.js";
import {
  Appointment,
  AppointmentStatus,
  PaymentStatus,
} from "../models/appointment.model.js";
import {
  Invoice,
  InvoiceStatus,
  InvoicePaymentMethod,
} from "../models/invoice.model.js";
import { AppError } from "../middleware/error-handler.js";
import { getIO } from "../socket.js";
import crypto from "crypto";
import { getClinicDateKey } from "../utils/clinic-date.js";

// ==========================================
// 1. Get Reception Overview Stats
// ==========================================
export const getReceptionOverview = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const today = getClinicDateKey();
    const todayStart = new Date(`${today}T00:00:00+05:30`);

    // 1. Registrations Today
    const [appointmentsToday, totalPatients, newPatientsToday] =
      await Promise.all([
        Appointment.countDocuments({ date: { $gte: today } }),
        User.countDocuments({ role: UserRole.PATIENT }),
        User.countDocuments({
          role: UserRole.PATIENT,
          createdAt: { $gte: todayStart },
        }),
      ]);

    const totalRegDisplay =
      appointmentsToday > 0 ? appointmentsToday : Math.max(totalPatients, 1);
    const repeatPatientsToday = Math.max(totalRegDisplay - newPatientsToday, 0);

    // 2. Tokens Waiting
    const waitingAppointments = await Appointment.find({
      date: { $gte: today },
      status: { $in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING] },
      $nor: [{ paymentMethod: "ONLINE", paymentStatus: "PENDING_ONLINE" }],
    })
      .populate("patient", "name phone")
      .populate("doctor", "name department")
      .sort({ createdAt: 1 });

    const tokensWaitingCount = waitingAppointments.length;
    let avgWaitMin = 14;
    if (waitingAppointments.length > 0) {
      const now = Date.now();
      const totalWaitMs = waitingAppointments.reduce((acc, appt) => {
        const created = appt.createdAt
          ? new Date(appt.createdAt).getTime()
          : now - 14 * 60000;
        return acc + Math.max(0, now - created);
      }, 0);
      avgWaitMin = Math.max(
        1,
        Math.round(totalWaitMs / waitingAppointments.length / 60000),
      );
    }

    // 3. Collections Today
    const paidInvoicesToday = await Invoice.find({
      $or: [
        { "paymentHistory.paidAt": { $gte: todayStart } },
        { paidAt: { $gte: todayStart } },
      ],
    }).select(
      "totalAmount paidAmount insuranceCoverage paymentMethod paidAt paymentHistory",
    );
    const todayPayments = paidInvoicesToday.flatMap((invoice) => {
      const history = (invoice.paymentHistory || []).filter(
        (payment) => payment.paidAt >= todayStart,
      );
      if (history.length) return history;
      // Fall back for bills recorded before payment history was added.
      if (invoice.paidAt && invoice.paidAt >= todayStart) {
        return [
          {
            amount:
              invoice.paymentMethod === InvoicePaymentMethod.INSURANCE
                ? invoice.insuranceCoverage || invoice.totalAmount
                : invoice.paidAmount ||
                  Math.max(
                    0,
                    invoice.totalAmount - (invoice.insuranceCoverage || 0),
                  ),
            method: invoice.paymentMethod,
          },
        ];
      }
      return [];
    });

    const totalCollectionsToday = todayPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const cashCount = todayPayments.filter(
      (payment) => payment.method === InvoicePaymentMethod.CASH,
    ).length;
    const cardCount = todayPayments.filter(
      (payment) => payment.method === InvoicePaymentMethod.CARD,
    ).length;
    const upiCount = todayPayments.filter(
      (payment) => payment.method === InvoicePaymentMethod.UPI,
    ).length;
    const insuranceCount = todayPayments.filter(
      (payment) => payment.method === InvoicePaymentMethod.INSURANCE,
    ).length;

    // 4. Insurance Captured
    const totalInvoicesToday = await Invoice.countDocuments({
      createdAt: { $gte: todayStart },
    });
    const insuranceInvoicesToday = await Invoice.countDocuments({
      createdAt: { $gte: todayStart },
      $or: [{ payer: "insurance" }, { insuranceCoverage: { $gt: 0 } }],
    });
    const insurancePercentage =
      totalInvoicesToday > 0
        ? ((insuranceInvoicesToday / totalInvoicesToday) * 100).toFixed(1)
        : "0.0";

    // 5. Recent Queue Snapshot
    const recentQueue = waitingAppointments
      .slice(0, 8)
      .map((a: any, idx: number) => ({
        id: a._id.toString(),
        tokenNumber: a.queueNumber
          ? `#${String(a.queueNumber).padStart(2, "0")}`
          : `${(a.department || "OPD").charAt(0).toUpperCase()}-${String(idx + 10).padStart(2, "0")}`,
        queueNumber: a.queueNumber,
        patientName: a.patient?.name || "Walk-in Patient",
        department: a.department || "General OPD",
        doctorName: a.doctor?.name || "On-Duty Clinician",
        timeSlot: a.timeSlot || "Walk-in",
        slotEndTime: a.slotEndTime,
        arrivalTime: a.arrivalTime,
        status: a.status,
        waitMinutes: Math.max(
          1,
          Math.round((Date.now() - new Date(a.createdAt).getTime()) / 60000),
        ),
      }));

    res.status(200).json({
      success: true,
      data: {
        registrations: {
          total: totalRegDisplay,
          newToday: newPatientsToday,
          repeatToday: repeatPatientsToday,
          note: `${newPatientsToday} new · ${repeatPatientsToday} repeat`,
        },
        tokens: {
          waiting: tokensWaitingCount,
          avgWaitMinutes: avgWaitMin,
          note: `avg wait ${avgWaitMin} min`,
        },
        collections: {
          total: totalCollectionsToday,
          value:
            totalCollectionsToday >= 100000
              ? `₹${(totalCollectionsToday / 100000).toFixed(2)} L`
              : `₹${totalCollectionsToday.toLocaleString("en-IN")}`,
          subValue: "total",
          breakdown: `${cashCount} cash · ${cardCount} card · ${upiCount} UPI · ${insuranceCount} insurer`,
          note: "cash + card + UPI + insurer",
        },
        insurance: {
          value: insurancePercentage,
          subValue: "%",
          capturedCount: insuranceInvoicesToday,
          totalChecked: totalInvoicesToday,
          note: "target 95%",
        },
        recentQueue,
      },
    });
  } catch (error: any) {
    console.error("Error fetching reception overview:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reception overview",
    });
  }
};

// ==========================================
// 2. Register Patient & Issue Token
// ==========================================
export const registerPatientAndCreateToken = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      address,
      department,
      payer,
    } = req.body;

    if (!firstName || !phone || !department) {
      throw new AppError("First name, phone, and department are required", 400);
    }

    const name = lastName ? `${firstName} ${lastName}` : firstName;

    // Try to find if user exists by phone
    let patient = await User.findOne({ phone, role: UserRole.PATIENT });
    let patientProfile = null;

    if (!patient) {
      // Create new user
      patient = new User({
        name,
        phone,
        email: `${phone}@healos-temp.com`, // Dummy email
        password: crypto.randomBytes(8).toString("hex"),
        role: UserRole.PATIENT,
      });
      await patient.save();

      // Create patient profile
      patientProfile = new PatientProfile({
        user: patient._id,
        dateOfBirth: dateOfBirth || null,
        gender: gender || "FEMALE",
        address,
      });
      await patientProfile.save();
    } else {
      // Find existing profile or create it
      patientProfile = await PatientProfile.findOne({ user: patient._id });
      if (!patientProfile) {
        patientProfile = new PatientProfile({
          user: patient._id,
          dateOfBirth: dateOfBirth || null,
          gender: gender || "FEMALE",
          address,
        });
        await patientProfile.save();
      }
    }

    // Assign doctor from requested department, or fallback to any available doctor
    let doctor = await User.findOne({ role: UserRole.DOCTOR, department });
    if (!doctor) {
      doctor = await User.findOne({ role: UserRole.DOCTOR });
    }
    if (!doctor) {
      doctor = await User.findOne({ role: UserRole.ADMIN });
    }
    const doctorId = doctor?._id;

    // Create an Appointment / Token
    const appointment = new Appointment({
      patient: patient._id,
      doctor: doctorId,
      department,
      date: new Date(),
      timeSlot: "Walk-in",
      reason: "OPD Consultation",
      status: AppointmentStatus.CONFIRMED,
    });
    await appointment.save();

    // Generate Invoice for OPD Consult
    const issuedById =
      (req as any).user?._id ||
      (req as any).user?.id ||
      (await User.findOne({ role: UserRole.ADMIN }))?._id;
    const invoice = new Invoice({
      patient: patient._id,
      issuedBy: issuedById,
      appointment: appointment._id,
      items: [{ description: "OPD Consultation", amount: 500 }],
      totalAmount: 500,
      payer: payer || "self",
      insuranceCoverage: payer === "insurance" ? 500 : 0,
    });
    await invoice.save();

    const token = `${department.charAt(0).toUpperCase()}-${Math.floor(Math.random() * 90) + 10}`;

    try {
      const io = getIO();
      io.emit("reception:overview_updated");
      io.emit("reception:token_created", {
        token,
        patientName: name,
        department,
      });
    } catch {}

    res.status(201).json({
      status: "success",
      data: { patient, appointment, token, invoice },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to register patient",
    });
  }
};

// ==========================================
// 3. Get Today's Queue
// ==========================================
export const getQueue = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
      date: { $gte: today },
    })
      .populate("patient", "name phone")
      .populate("doctor", "name department")
      .sort({ createdAt: 1 });

    res.status(200).json({
      status: "success",
      data: { appointments },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to fetch queue",
    });
  }
};

// ==========================================
// 4. Get Pending Invoices
// ==========================================
export const getPendingBills = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const invoices = await Invoice.find({
      status: { $in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL] },
    })
      .populate("patient", "name firstName lastName phone")
      .populate("appointment", "paidAmount")
      .sort({ createdAt: 1 });

    const dueInvoices = invoices.filter((invoice) => {
      const appointmentPaid = (invoice.appointment as any)?.paidAmount || 0;
      const paid = Math.max(invoice.paidAmount || 0, appointmentPaid);
      return invoice.totalAmount - (invoice.insuranceCoverage || 0) - paid > 0;
    });

    res.status(200).json({
      status: "success",
      data: { invoices: dueInvoices },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to fetch pending bills",
    });
  }
};

// ==========================================
// 5. Pay Bill
// ==========================================
export const payBill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;
    const method = Object.values(InvoicePaymentMethod).find(
      (candidate) => candidate === paymentMethod,
    );
    if (!method) throw new AppError("Choose a valid payment method", 400);

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new AppError("This invoice has been cancelled", 409);
    }
    if (invoice.status === InvoiceStatus.PAID) {
      throw new AppError("This invoice is already settled", 409);
    }
    const appointment = invoice.appointment
      ? await Appointment.findById(invoice.appointment)
      : null;
    const paidSoFar = Math.max(
      invoice.paidAmount || 0,
      appointment?.paidAmount || 0,
    );
    const due = Math.max(
      0,
      invoice.totalAmount - (invoice.insuranceCoverage || 0) - paidSoFar,
    );
    if (due <= 0) throw new AppError("This invoice has no balance due", 409);

    const paidAt = new Date();
    const settledInvoice = await Invoice.findOneAndUpdate(
      { _id: invoice._id, __v: invoice.__v || 0, status: invoice.status },
      {
        $set: {
          paidAmount:
            method === InvoicePaymentMethod.INSURANCE
              ? paidSoFar
              : paidSoFar + due,
          insuranceCoverage:
            method === InvoicePaymentMethod.INSURANCE
              ? (invoice.insuranceCoverage || 0) + due
              : invoice.insuranceCoverage || 0,
          status: InvoiceStatus.PAID,
          paymentMethod: method,
          paidAt,
        },
        $push: {
          paymentHistory: {
            amount: due,
            method,
            source: "RECEPTION",
            recordedBy: req.user?._id,
            paidAt,
          },
        },
        $inc: { __v: 1 },
      },
      { new: true, runValidators: true },
    );
    if (!settledInvoice) {
      throw new AppError(
        "This invoice changed while it was being settled. Refresh and check its balance.",
        409,
      );
    }

    if (appointment) {
      appointment.paidAmount = Math.max(
        appointment.paidAmount || 0,
        settledInvoice.paidAmount || 0,
      );
      appointment.paymentStatus =
        appointment.paidAmount + (settledInvoice.insuranceCoverage || 0) >=
        appointment.amount
          ? PaymentStatus.PAID
          : PaymentStatus.PENDING_CASH;
      await appointment.save();
    }

    try {
      const io = getIO();
      io.emit("reception:overview_updated");
      io.emit("invoice_paid", { invoiceId: settledInvoice._id });
      io.emit("invoice_updated", { invoiceId: settledInvoice._id });
      io.emit("admin:data_changed", { types: ["invoices", "billing"] });
      io.emit("reception:bill_paid", {
        invoiceId: settledInvoice._id,
        amount: due,
      });
      if (appointment) {
        io.emit("appointment_updated", {
          appointmentId: appointment._id,
          doctorId: appointment.doctor,
          patientId: appointment.patient,
          status: appointment.status,
          paymentStatus: appointment.paymentStatus,
        });
      }
    } catch {}

    res.status(200).json({
      status: "success",
      data: { invoice: settledInvoice },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to pay bill",
    });
  }
};
