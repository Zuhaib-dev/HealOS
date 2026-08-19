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

/**
 * GET /api/v1/nurse/fluids
 * Get fluid balances
 */
export const getFluidBalances = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { FluidBalance } = await import("../models/fluid-balance.model.js");
    const fluids = await FluidBalance.find().sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ success: true, fluids });
  } catch (error) {
    console.error("Error in getFluidBalances:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error fetching fluid balances" });
  }
};

/**
 * GET /api/v1/nurse/call-bells
 * Get call bells
 */
export const getCallBells = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { CallBell } = await import("../models/call-bell.model.js");
    const callBells = await CallBell.find().sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ success: true, callBells });
  } catch (error) {
    console.error("Error in getCallBells:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error fetching call bells" });
  }
};

/**
 * PATCH /api/v1/nurse/call-bells/:id/resolve
 * Resolve a call bell
 */
export const resolveCallBell = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { CallBell } = await import("../models/call-bell.model.js");
    const callBell = await CallBell.findByIdAndUpdate(
      id,
      { state: "closed" },
      { new: true }
    );
    if (!callBell) {
      res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Call bell not found" });
      return;
    }
    res.status(StatusCodes.OK).json({ success: true, callBell });
  } catch (error) {
    console.error("Error in resolveCallBell:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error resolving call bell" });
  }
};

/**
 * GET /api/v1/nurse/emar
 * Get medication administration records
 */
export const getMarDoses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { MarDose } = await import("../models/mar-dose.model.js");
    const doses = await MarDose.find().sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ success: true, doses });
  } catch (error) {
    console.error("Error in getMarDoses:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error fetching medication doses" });
  }
};

/**
 * PATCH /api/v1/nurse/emar/:id/administer
 * Mark a medication dose as given
 */
export const administerMarDose = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { MarDose } = await import("../models/mar-dose.model.js");
    const dose = await MarDose.findByIdAndUpdate(
      id,
      { state: "given" },
      { new: true }
    );
    if (!dose) {
      res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Dose not found" });
      return;
    }
    res.status(StatusCodes.OK).json({ success: true, dose });
  } catch (error) {
    console.error("Error in administerMarDose:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error administering dose" });
  }
};

/**
 * GET /api/v1/nurse/wounds
 * Get wound care records
 */
export const getWounds = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { Wound } = await import("../models/wound.model.js");
    const wounds = await Wound.find().sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ success: true, wounds });
  } catch (error) {
    console.error("Error in getWounds:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error fetching wounds" });
  }
};

/**
 * GET /api/v1/nurse/handovers
 * Get nurse handovers
 */
export const getHandovers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { Handover } = await import("../models/handover.model.js");
    // Ensure we only fetch nurse handovers (they will have a 'bed' field seeded)
    const handovers = await Handover.find({ bed: { $exists: true } }).sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ success: true, handovers });
  } catch (error) {
    console.error("Error in getHandovers:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error fetching handovers" });
  }
};

/**
 * POST /api/v1/nurse/handovers
 * Create a new nurse handover
 */
export const createHandover = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientName, bed, situation, background, assessment, recommendation, acuity } = req.body;
    const { Handover } = await import("../models/handover.model.js");
    const handover = new Handover({
      patientName,
      bed,
      situation,
      background,
      assessment,
      recommendation,
      acuity,
      status: "PENDING",
      type: "NURSE_SHIFT",
    });
    await handover.save();
    res.status(StatusCodes.CREATED).json({ success: true, handover });
  } catch (error) {
    console.error("Error in createHandover:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error creating handover" });
  }
};

