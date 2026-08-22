import { Request, Response } from "express";
import { User, UserRole, PatientProfile } from "../models/index.js";
import { Appointment, AppointmentStatus } from "../models/appointment.model.js";
import { Invoice, InvoiceStatus, InvoicePaymentMethod } from "../models/invoice.model.js";
import { AppError } from "../middleware/error-handler.js";
import crypto from "crypto";

// ==========================================
// 1. Register Patient & Issue Token
// ==========================================
export const registerPatientAndCreateToken = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phone, dateOfBirth, gender, address, department, payer } = req.body;

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

    // Assign a random doctor from the requested department (mock logic)
    const doctors = await User.find({ role: UserRole.DOCTOR, department });
    const doctorId = doctors.length > 0 ? doctors[0]?._id : null; // Fallback to null if no doctor in that dept

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
    const invoice = new Invoice({
      patient: patient._id,
      receptionist: (req as any).user?._id,
      appointment: appointment._id,
      items: [{ description: "OPD Consultation", amount: 500 }],
      totalAmount: 500,
      payer: payer || "self",
      insuranceCoverage: payer === "insurance" ? 500 : 0, // Mock insurance logic
    });
    await invoice.save();

    // Mock Token e.g. A-14
    const token = `${department.charAt(0).toUpperCase()}-${Math.floor(Math.random() * 90) + 10}`;

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
// 2. Get Today's Queue
// ==========================================
export const getQueue = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
      date: { $gte: today },
    })
      .populate("patient", "firstName lastName phone")
      .populate("doctor", "firstName lastName department")
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
// 3. Get Pending Invoices
// ==========================================
export const getPendingBills = async (_req: Request, res: Response): Promise<void> => {
  try {
    const invoices = await Invoice.find({ status: InvoiceStatus.PENDING })
      .populate("patient", "firstName lastName phone")
      .sort({ createdAt: 1 });

    res.status(200).json({
      status: "success",
      data: { invoices },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to fetch pending bills",
    });
  }
};

// ==========================================
// 4. Pay Bill
// ==========================================
export const payBill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paymentMethod = paymentMethod as InvoicePaymentMethod;
    invoice.paidAt = new Date();
    await invoice.save();

    res.status(200).json({
      status: "success",
      data: { invoice },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to pay bill",
    });
  }
};
