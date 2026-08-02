import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Vitals } from "../models/vitals.model.js";
import { Appointment } from "../models/appointment.model.js";

/**
 * GET /api/v1/nurse/queue
 * Get today's confirmed appointments that need vitals taken
 */
export const getVitalsQueue = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's appointments
    const appointments = await Appointment.find({
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ["CONFIRMED", "PENDING"] },
    })
      .populate("patient", "name phone gender dateOfBirth")
      .populate("doctor", "name")
      .sort({ createdAt: 1 });

    // Check which appointments already have vitals recorded
    const appointmentIds = appointments.map(a => a._id);
    const existingVitals = await Vitals.find({
      appointment: { $in: appointmentIds },
    });
    const vitalsMap = new Map(existingVitals.map(v => [v.appointment?.toString(), v]));

    const queue = appointments.map(apt => ({
      appointment: apt,
      vitals: vitalsMap.get(apt._id.toString()) || null,
      hasVitals: vitalsMap.has(apt._id.toString()),
    }));

    res.status(StatusCodes.OK).json({
      success: true,
      queue,
    });
  } catch (error) {
    console.error("Error in getVitalsQueue:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching vitals queue",
    });
  }
};

/**
 * POST /api/v1/nurse/vitals
 * Record vitals for a patient
 */
export const recordVitals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, appointmentId, heartRate, respiratoryRate, spo2, temperature, bloodPressure, weight, height, notes } = req.body;

    if (!patientId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Patient ID is required",
      });
      return;
    }

    const vitals = new Vitals({
      patient: patientId,
      appointment: appointmentId || undefined,
      recordedBy: (req as any).user?._id,
      heartRate: heartRate || undefined,
      respiratoryRate: respiratoryRate || undefined,
      spo2: spo2 || undefined,
      temperature: temperature || undefined,
      bloodPressure: bloodPressure || undefined,
      weight: weight || undefined,
      height: height || undefined,
      notes: notes || undefined,
    });

    await vitals.save();

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Vitals recorded successfully",
      vitals,
    });
  } catch (error) {
    console.error("Error in recordVitals:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error recording vitals",
    });
  }
};

/**
 * GET /api/v1/nurse/vitals/:patientId
 * Get vitals history for a patient
 */
export const getPatientVitals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const vitals = await Vitals.find({ patient: patientId })
      .populate("recordedBy", "name")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(StatusCodes.OK).json({
      success: true,
      vitals,
    });
  } catch (error) {
    console.error("Error in getPatientVitals:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching patient vitals",
    });
  }
};
