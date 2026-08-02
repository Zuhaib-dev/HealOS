import { Request, Response } from "express";
import {
  Appointment,
  Consultation,
  DiagnosticOrder,
  DiagnosticReport,
} from "../models/index.js";
import { AppError } from "../middleware/error-handler.js";

// ==========================================
// 1. Get Doctor's Appointments
// ==========================================
export const getAppointments = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?.id;
    // For now, fetch all pending appointments for this doctor
    const appointments = await Appointment.find({
      doctor: doctorId,
    })
      .populate("patient", "firstName lastName email avatar role")
      .sort({ date: 1, timeSlot: 1 });

    res.status(200).json({
      status: "success",
      data: { appointments },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to fetch appointments" });
  }
};

// ==========================================
// 2. Create or Update Consultation (Prescription)
// ==========================================
export const saveConsultation = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?.id;
    const {
      patientId,
      appointmentId,
      chiefComplaint,
      diagnosis,
      advice,
      medicines,
      status, // DRAFT or COMPLETED
    } = req.body;

    if (!patientId) {
      throw new AppError("Patient ID is required", 400);
    }

    // Check if consultation for this appointment already exists
    let consultation;
    if (appointmentId) {
      consultation = await Consultation.findOne({ appointment: appointmentId });
    }

    if (consultation) {
      // Update existing
      consultation.chiefComplaint = chiefComplaint;
      consultation.diagnosis = diagnosis;
      consultation.advice = advice;
      consultation.medicines = medicines;
      consultation.status = status;
      await consultation.save();
    } else {
      // Create new
      consultation = await Consultation.create({
        patient: patientId,
        doctor: doctorId,
        appointment: appointmentId,
        chiefComplaint,
        diagnosis,
        advice,
        medicines,
        status,
      });
    }

    // If completed, update appointment status
    if (status === "COMPLETED" && appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, { status: "COMPLETED" });
    }

    res.status(200).json({
      status: "success",
      data: { consultation },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to save consultation",
    });
  }
};

// ==========================================
// 3. Create Diagnostic Order
// ==========================================
export const orderDiagnostic = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?.id;
    const {
      patientId,
      consultationId,
      testType,
      testName,
      priority,
      clinicalNotes,
    } = req.body;

    if (!patientId || !testType || !testName) {
      throw new AppError("Patient ID, testType, and testName are required", 400);
    }

    const order = await DiagnosticOrder.create({
      patient: patientId,
      doctor: doctorId,
      consultation: consultationId,
      testType,
      testName,
      priority,
      clinicalNotes,
    });

    res.status(201).json({
      status: "success",
      data: { order },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to order diagnostic",
    });
  }
};

// ==========================================
// 4. Get Patient Medical History
// ==========================================
export const getPatientHistory = async (req: Request, res: Response) => {
  try {
    const { id: patientId } = req.params;

    const consultations = await Consultation.find({ patient: patientId })
      .populate("doctor", "firstName lastName")
      .sort({ createdAt: -1 });

    const diagnosticOrders = await DiagnosticOrder.find({ patient: patientId })
      .populate("doctor", "firstName lastName")
      .sort({ createdAt: -1 });

    const diagnosticReports = await DiagnosticReport.find({ patient: patientId })
      .populate("radiologist", "firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      data: {
        consultations,
        diagnosticOrders,
        diagnosticReports,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to fetch patient history" });
  }
};
