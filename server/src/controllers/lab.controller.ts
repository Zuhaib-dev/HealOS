import { Request, Response } from "express";
import { DiagnosticOrder, DiagnosticReport, LabAnalyser } from "../models/index.js";
import { getIO } from "../socket.js";

export const getCollections = async (_req: Request, res: Response) => {
  try {
    const orders = await DiagnosticOrder.find({ testType: "PATHOLOGY", status: { $in: ["PENDING", "IN_PROGRESS"] } })
      .populate("patient", "name mrn phone")
      .sort({ priority: -1, createdAt: 1 });
      
    res.status(200).json({ success: true, collections: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const markCollected = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await DiagnosticOrder.findByIdAndUpdate(id, { status: "IN_PROGRESS" }, { new: true });
    
    const io = getIO();
    if (io) io.emit("lab_collection_updated", { order });
    
    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getSamples = async (_req: Request, res: Response) => {
  try {
    const samples = await DiagnosticOrder.find({ testType: "PATHOLOGY", status: { $in: ["IN_PROGRESS", "REPORTED"] } })
      .populate("patient", "name")
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, samples });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getPendingValidation = async (_req: Request, res: Response) => {
  try {
    const reports = await DiagnosticReport.find({ state: "pending sign" })
      .populate({ path: "order", match: { testType: "PATHOLOGY" } })
      .populate("patient", "name")
      .sort({ createdAt: -1 });
      
    // Filter out reports where order wasn't pathology
    const validReports = reports.filter(r => r.order !== null);
    
    res.status(200).json({ success: true, pending: validReports });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const validateReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await DiagnosticReport.findByIdAndUpdate(id, { state: "verified" }, { new: true });
    
    const io = getIO();
    if (io) io.emit("lab_report_validated", { report });
    
    res.status(200).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAnalysers = async (_req: Request, res: Response) => {
  try {
    const analysers = await LabAnalyser.find().sort({ name: 1 });
    res.status(200).json({ success: true, analysers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getCriticalValues = async (_req: Request, res: Response) => {
  try {
    const criticals = await DiagnosticReport.find({ isCritical: true, state: "pending sign" })
      .populate({ path: "order", match: { testType: "PATHOLOGY" } })
      .populate("patient", "name")
      .sort({ createdAt: -1 });
      
    res.status(200).json({ success: true, criticalValues: criticals.filter(c => c.order !== null) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getLabStats = async (_req: Request, res: Response) => {
  try {
    const pendingCount = await DiagnosticOrder.countDocuments({ testType: "PATHOLOGY", status: "PENDING" });
    const inProgressCount = await DiagnosticOrder.countDocuments({ testType: "PATHOLOGY", status: "IN_PROGRESS" });
    const criticalCount = await DiagnosticReport.countDocuments({ isCritical: true, state: "pending sign" });
    
    res.status(200).json({
      success: true,
      stats: {
        pendingCollections: pendingCount,
        inProgressSamples: inProgressCount,
        criticalFlags: criticalCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
