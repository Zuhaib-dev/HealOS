import { Request, Response } from "express";
import {
  User,
  UserRole,
  PatientProfile,
  ProfessionalProfile,
  DoctorAvailability,
} from "../models/index.js";
import {
  Appointment,
  AppointmentSource,
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
import { z } from "zod";

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
        Appointment.countDocuments({ date: today }),
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
      date: today,
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
  let patientIdToRollback: string | undefined;
  let appointmentIdToRollback: string | undefined;
  let invoiceIdToRollback: string | undefined;
  try {
    const parsed = z
      .object({
        firstName: z.string().trim().min(1),
        lastName: z.string().trim().optional(),
        phone: z.string().trim().min(10),
        dateOfBirth: z.string().optional(),
        gender: z.enum(["MALE", "FEMALE", "Male", "Female"]),
        address: z.string().trim().optional(),
        department: z.string().trim().min(1),
        doctorId: z.string().regex(/^[a-f\d]{24}$/i),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        timeSlot: z.string().regex(/^\d{2}:\d{2}$/),
        reason: z.string().trim().min(3).max(500),
        payer: z.enum(["self", "insurance", "corporate"]).default("self"),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        parsed.error.issues[0]?.message || "Check the walk-in details",
        400,
      );
    }
    const {
      firstName,
      lastName,
      phone: rawPhone,
      dateOfBirth,
      gender,
      address,
      department,
      doctorId,
      date,
      timeSlot,
      reason,
      payer,
    } = parsed.data;
    if (date !== getClinicDateKey()) {
      throw new AppError("Walk-in appointments must be booked for today", 400);
    }

    const name = [firstName, lastName].filter(Boolean).join(" ");
    const phoneDigits = rawPhone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      throw new AppError("Enter a valid patient mobile number", 400);
    }
    const phone = `+${phoneDigits}`;
    const doctorProfile = await ProfessionalProfile.findOne({
      user: doctorId,
      requestedRole: UserRole.DOCTOR,
      status: "APPROVED",
    }).select("specialization");
    const doctor = await User.findOne({ _id: doctorId, role: UserRole.DOCTOR });
    if (!doctor || !doctorProfile) {
      throw new AppError("Select an approved doctor", 400);
    }
    if (doctorProfile.specialization !== department) {
      throw new AppError("The selected doctor is not in this department", 400);
    }

    const requestedDate = new Date(`${date}T00:00:00.000Z`);
    const availability = await DoctorAvailability.findOne({
      doctor: doctorId,
      active: true,
      weekdays: requestedDate.getUTCDay(),
    });
    if (!availability) {
      throw new AppError("This doctor has no booking hours today", 409);
    }
    const toMinutes = (value: string) => {
      const [hours = 0, minutes = 0] = value.split(":").map(Number);
      return hours * 60 + minutes;
    };
    const slotMinute = toMinutes(timeSlot);
    const scheduleStart = toMinutes(availability.startTime);
    const scheduleEnd = toMinutes(availability.endTime);
    const aligned =
      slotMinute >= scheduleStart &&
      slotMinute + availability.slotDurationMinutes <= scheduleEnd &&
      (slotMinute - scheduleStart) % availability.slotDurationMinutes === 0;
    if (!aligned) throw new AppError("Choose a valid doctor time slot", 400);
    const clinicTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .format(new Date())
      .split(":")
      .map(Number);
    const [currentHour = 0, currentMinute = 0] = clinicTime;
    if (slotMinute <= currentHour * 60 + currentMinute) {
      throw new AppError("Choose a time slot that has not passed", 409);
    }
    const occupiedCount = await Appointment.countDocuments({
      doctor: doctorId,
      date,
      status: { $ne: AppointmentStatus.CANCELLED },
    });
    const capacity = Math.min(
      availability.maxPatientsPerDay,
      Math.floor(
        (scheduleEnd - scheduleStart) / availability.slotDurationMinutes,
      ),
    );
    if (occupiedCount >= capacity) {
      throw new AppError(
        "This doctor has reached the daily appointment limit",
        409,
      );
    }

    let patient = await User.findOne({
      role: UserRole.PATIENT,
      phone: { $in: [rawPhone, phoneDigits, phone] },
    });
    if (!patient) {
      patient = new User({
        name,
        phone,
        email: `${phoneDigits}@healos-temp.com`,
        password: crypto.randomBytes(8).toString("hex"),
        role: UserRole.PATIENT,
      });
      await patient.save();
      patientIdToRollback = patient._id.toString();
    }
    await PatientProfile.findOneAndUpdate(
      { user: patient._id },
      {
        $set: {
          ...(dateOfBirth ? { dob: dateOfBirth } : {}),
          gender: gender.toUpperCase(),
          ...(address ? { address } : {}),
        },
        $setOnInsert: { user: patient._id },
      },
      { upsert: true, new: true, runValidators: true },
    );

    const queueRows = await Appointment.find({ doctor: doctorId, date })
      .select("queueNumber")
      .lean();
    const queueNumber =
      queueRows.reduce((max, row) => Math.max(max, row.queueNumber || 0), 0) +
      1;
    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      department: doctorProfile.specialization,
      date,
      timeSlot,
      queueNumber,
      reason,
      type: "IN_PERSON",
      status: AppointmentStatus.CONFIRMED,
      paymentMethod: "CASH",
      paymentStatus: PaymentStatus.PENDING_CASH,
      amount: availability.consultationFee,
      advanceAmount: availability.advanceFee,
      source: AppointmentSource.RECEPTION_WALK_IN,
    });
    appointmentIdToRollback = appointment._id.toString();
    const token = `${department
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase()}-${String(queueNumber).padStart(3, "0")}-${appointment._id
      .toString()
      .slice(-4)
      .toUpperCase()}`;
    appointment.queueToken = token;
    await appointment.save();

    const issuedById = req.user?._id || req.user?.id;
    const totalAmount = availability.consultationFee;
    const invoice = await Invoice.create({
      patient: patient._id,
      issuedBy: issuedById,
      appointment: appointment._id,
      items: [{ description: "OPD Consultation", amount: totalAmount }],
      totalAmount,
      payer,
      insuranceCoverage: payer === "insurance" ? totalAmount : 0,
    });
    invoiceIdToRollback = invoice._id.toString();
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("doctor", "name email phone avatarUrl")
      .populate("patient", "name email phone avatarUrl");

    try {
      const io = getIO();
      io.emit("reception:overview_updated");
      io.emit("admin:data_changed", {
        types: ["users", "patients", "billing"],
      });
      io.emit("appointment_created", {
        appointmentId: appointment._id,
        doctorId: doctor._id,
        patientId: patient._id,
        source: AppointmentSource.RECEPTION_WALK_IN,
      });
      io.emit("reception:token_created", {
        token,
        patientName: name,
        department,
        doctorId: doctor._id,
      });
    } catch {}

    res.status(201).json({
      success: true,
      status: "success",
      data: { patient, appointment: populatedAppointment, token, invoice },
    });
  } catch (error: any) {
    if (invoiceIdToRollback)
      await Invoice.findByIdAndDelete(invoiceIdToRollback);
    if (appointmentIdToRollback)
      await Appointment.findByIdAndDelete(appointmentIdToRollback);
    if (patientIdToRollback) {
      await PatientProfile.findOneAndDelete({ user: patientIdToRollback });
      await User.findByIdAndDelete(patientIdToRollback);
    }
    res.status(error.statusCode || (error.code === 11000 ? 409 : 500)).json({
      status: "error",
      message:
        error.code === 11000
          ? "That doctor slot was just booked. Refresh availability and choose another time."
          : error.message || "Failed to register patient",
    });
  }
};

// ==========================================
// 3. Get Today's Queue
// ==========================================
export const getQueue = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = getClinicDateKey();

    const appointments = await Appointment.find({
      date: new RegExp(`^${today}`),
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

export const getWalkInAppointments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const date =
      typeof req.query.date === "string" ? req.query.date : getClinicDateKey();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError("Choose a valid date", 400);
    }
    const appointments = await Appointment.find({
      date: new RegExp(`^${date}`),
      $or: [
        { source: AppointmentSource.RECEPTION_WALK_IN },
        { timeSlot: "Walk-in" },
      ],
    })
      .populate("patient", "name email phone")
      .populate("doctor", "name email")
      .sort({ createdAt: -1 })
      .limit(200);
    res.status(200).json({ success: true, appointments });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch walk-in appointments",
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
