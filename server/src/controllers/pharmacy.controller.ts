import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Consultation } from "../models/consultation.model.js";

/**
 * GET /api/v1/pharmacy/prescriptions/pending
 * Get all consultations that have medicines where at least one is NOT dispensed
 */
export const getPendingPrescriptions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const consultations = await Consultation.find({
      medicines: { $exists: true, $not: { $size: 0 } },
      "medicines.isDispensed": false,
    })
      .populate("patient", "name phone")
      .populate("doctor", "name")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      prescriptions: consultations,
    });
  } catch (error) {
    console.error("Error in getPendingPrescriptions:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching pending prescriptions",
    });
  }
};

/**
 * PATCH /api/v1/pharmacy/prescriptions/:consultationId/dispense
 * Mark a specific medicine as dispensed in a consultation
 */
export const dispenseMedicine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { consultationId } = req.params;
    const { medicineId } = req.body; // _id of the medicine subdocument

    if (!medicineId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Medicine ID is required",
      });
      return;
    }

    const consultation = await Consultation.findOneAndUpdate(
      { _id: consultationId, "medicines._id": medicineId },
      { $set: { "medicines.$.isDispensed": true } },
      { new: true }
    );

    if (!consultation) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Consultation or medicine not found",
      });
      return;
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Medicine dispensed successfully",
      consultation,
    });
  } catch (error) {
    console.error("Error in dispenseMedicine:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while dispensing medicine",
    });
  }
};
