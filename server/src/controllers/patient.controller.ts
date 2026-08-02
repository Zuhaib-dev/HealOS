import { Request, Response } from "express";
import {
  Appointment,
  Consultation,
  DiagnosticOrder,
  DiagnosticReport,
} from "../models/index.js";
import { AppError } from "../middleware/error-handler.js";

// ==========================================
// 1. Get Patient Dashboard
// ==========================================
export const getPatientDashboard = async (req: Request, res: Response) => {
  try {
    const patientId = req.user?.id;

    if (!patientId) {
      throw new AppError("Patient not found", 404);
    }

    // 1. Get Upcoming Appointments
    const appointments = await Appointment.find({
      patient: patientId,
      status: { $in: ["PENDING", "CONFIRMED"] },
    })
      .populate("doctor", "firstName lastName role specialization")
      .sort({ date: 1, timeSlot: 1 });

    // 2. Get Consultations (History & Prescriptions)
    const consultations = await Consultation.find({ patient: patientId })
      .populate("doctor", "firstName lastName role")
      .sort({ createdAt: -1 });

    // 3. Get Diagnostic Orders (Pending & Completed)
    const diagnosticOrders = await DiagnosticOrder.find({ patient: patientId })
      .populate("doctor", "firstName lastName")
      .sort({ createdAt: -1 });

    // 4. Get Diagnostic Reports
    const diagnosticReports = await DiagnosticReport.find({ patient: patientId })
      .populate("uploadedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      data: {
        appointments,
        consultations,
        diagnosticOrders,
        diagnosticReports,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to fetch patient dashboard",
    });
  }
};
