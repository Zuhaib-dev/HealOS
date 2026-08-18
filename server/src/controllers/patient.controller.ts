import { Request, Response } from "express";
import {
  Appointment,
  Consultation,
  DiagnosticOrder,
  DiagnosticReport,
  Invoice,
  Vitals,
  PatientProfile,
} from "../models/index.js";
import { z } from "zod";
import { AppError } from "../middleware/error-handler.js";

// ==========================================
// 1. Get Patient Dashboard
// ==========================================
export const getPatientDashboard = async (req: Request, res: Response) => {
  try {
    const patientId = req.user?._id;

    if (!patientId) {
      throw new AppError("Patient not found", 404);
    }

    // 1. Get Upcoming Appointments
    const appointments = await Appointment.find({
      patient: patientId,
      status: { $in: ["PENDING", "CONFIRMED"] },
    })
      .populate("doctor", "name role specialization")
      .sort({ date: 1, timeSlot: 1 });

    // 2. Get Consultations (History & Prescriptions)
    const consultations = await Consultation.find({ patient: patientId })
      .populate("doctor", "name role")
      .sort({ createdAt: -1 });

    // 3. Get Diagnostic Orders (Pending & Completed)
    const diagnosticOrders = await DiagnosticOrder.find({ patient: patientId })
      .populate("doctor", "name")
      .sort({ createdAt: -1 });

    // 4. Get Diagnostic Reports
    const diagnosticReports = await DiagnosticReport.find({ patient: patientId })
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });

    // 5. Get Vitals
    const vitals = await Vitals.find({ patient: patientId }).sort({ createdAt: -1 });

    // 6. Get Invoices
    const invoices = await Invoice.find({ patient: patientId })
      .populate("appointment", "date timeSlot")
      .sort({ createdAt: -1 });
      
    // 7. Get Profile
    const profile = await PatientProfile.findOne({ user: patientId });

    res.status(200).json({
      status: "success",
      data: {
        profile,
        appointments,
        consultations,
        diagnosticOrders,
        diagnosticReports,
        vitals,
        invoices,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to fetch patient dashboard",
    });
  }
};

const profileSchema = z.object({
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).optional(),
  emergencyPhone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medicalHistory: z.string().optional(),
  address: z.string().optional(),
  height: z.number().optional(),
  heightUnit: z.enum(["cm", "ft"]).optional(),
  weight: z.number().optional(),
});

export const updatePatientProfile = async (req: Request, res: Response) => {
  try {
    const patientId = req.user?.id;
    const parsed = profileSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile data",
        errors: parsed.error.format(),
      });
    }

    let profile = await PatientProfile.findOne({ user: patientId });
    if (!profile) {
      profile = new PatientProfile({ user: patientId });
    }

    Object.assign(profile, parsed.data);
    profile.isComplete = true; // Mark as complete upon manual update
    await profile.save();

    res.status(200).json({
      success: true,
      message: "Patient profile updated successfully",
      profile,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update patient profile",
    });
  }
};

export const payInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const patientId = req.user?.id;
    
    const invoice = await Invoice.findOne({ _id: id, patient: patientId });
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found or unauthorized" });
    }

    if (invoice.status === "PAID") {
      return res.status(400).json({ success: false, message: "Invoice is already paid" });
    }

    invoice.status = "PAID" as any; // InvoiceStatus.PAID
    invoice.paidAt = new Date();
    
    // Check if it's an appointment invoice
    if (invoice.appointment) {
      const appointment = await Appointment.findById(invoice.appointment);
      if (appointment) {
        appointment.paymentStatus = "PAID" as any;
        await appointment.save();
      }
    }
    
    await invoice.save();

    res.status(200).json({ success: true, message: "Invoice paid successfully", invoice });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to pay invoice",
    });
  }
};
