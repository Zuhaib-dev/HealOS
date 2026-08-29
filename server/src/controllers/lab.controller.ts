import { Request, Response } from "express";
import { DiagnosticOrder, DiagnosticReport, LabAnalyser, Invoice, InvoiceStatus, InvoicePaymentMethod } from "../models/index.js";
import { getIO } from "../socket.js";
import { AppError } from "../middleware/error-handler.js";
import fs from "fs";
import ImageKit from "imagekit";
import { envConfig } from "../config/env.js";

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_key",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_key",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/your_endpoint"
});


export const uploadLabReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Order ID
    const uploadedBy = req.user?.id;
    const file = req.file;

    if (!file) {
      throw new AppError("Please upload a PDF or Image file", 400);
    }

    const order = await DiagnosticOrder.findById(id);
    if (!order) {
      fs.unlinkSync(file.path);
      throw new AppError("Diagnostic order not found", 404);
    }

    let fileUrl = "";
    if (file) {
      try {
        if (process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PUBLIC_KEY !== "public_key") {
          const fileBuffer = await fs.promises.readFile(file.path);
          const uploadResponse = await imagekit.upload({
            file: fileBuffer,
            fileName: `lab_report_${order._id}_${Date.now()}`,
            folder: "/hms/reports",
          });
          fileUrl = uploadResponse.url;
          fs.unlinkSync(file.path); // clean up local after cloud upload
        } else {
          // No ImageKit keys -> Fallback to serving the local file that Multer saved
          fileUrl = `http://localhost:${envConfig.PORT || 5000}/uploads/reports/${file.filename}`;
        }
      } catch (err) {
        console.warn("Cloud upload failed, falling back to local file...", err);
        fileUrl = `http://localhost:${envConfig.PORT || 5000}/uploads/reports/${file.filename}`;
      }
    }

    const report = await DiagnosticReport.create({
      patient: order.patient,
      order: order._id,
      uploadedBy,
      fileUrl,
      fileName: file.originalname,
      title: "Lab Result - " + order.testName,
      state: "pending sign",
    });

    order.status = "REPORTED" as any;
    await order.save();

    res.status(201).json({
      status: "success",
      data: { report, order },
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to upload report",
    });
  }
};

export const getLabHistory = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const skip = (page - 1) * limit;

    // Optional: Filter by 'state: "released"' if you only want fully verified reports, 
    // or just fetch all diagnostic reports.
    let filter = {};
    
    // We cannot easily text search across populated fields in a single basic find, 
    // but we can search by title or fileName. In a real app, you'd aggregate.
    if (search) {
      filter = { title: { $regex: search, $options: "i" } };
    }

    const totalCount = await DiagnosticReport.countDocuments(filter);
    const reports = await DiagnosticReport.find(filter)
      .populate("patient", "name mrn")
      .populate("order", "testName accessionNumber status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      reports,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error fetching lab history" });
  }
};

export const getCollections = async (_req: Request, res: Response) => {
  try {
    const orders = await DiagnosticOrder.find({ testType: "PATHOLOGY", status: { $in: ["PENDING", "IN_PROGRESS"] } })
      .populate("patient", "name mrn phone")
      .sort({ priority: -1, createdAt: 1 })
      .lean();
      
    res.status(200).json({ success: true, collections: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createLabBill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    const order = await DiagnosticOrder.findById(id);
    if (!order) throw new AppError("Order not found", 404);

    const invoice = await Invoice.create({
      patient: order.patient,
      issuedBy: req.user?.id,
      items: [{ description: order.testName, amount: price }],
      totalAmount: price,
      status: InvoiceStatus.PENDING,
      payer: "self",
      insuranceCoverage: 0,
    });
    
    const io = getIO();
    if (io) io.emit("invoice_created", { invoice });

    res.status(201).json({ success: true, invoice });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to create bill" });
  }
};

export const markCollected = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentMethod, price } = req.body;
    
    const order = await DiagnosticOrder.findByIdAndUpdate(id, { status: "IN_PROGRESS" }, { new: true });
    
    if (paymentMethod && price) {
       await Invoice.create({
          patient: order?.patient,
          issuedBy: req.user?.id,
          items: [{ description: order?.testName || "Lab Test", amount: price }],
          totalAmount: price,
          status: InvoiceStatus.PAID,
          paymentMethod: paymentMethod as InvoicePaymentMethod,
          payer: "self",
          insuranceCoverage: 0,
          paidAt: new Date(),
       });
       // Optional: emit invoice_created if we want to sync
    }
    
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
      .sort({ createdAt: -1 })
      .lean();
      
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
      .sort({ createdAt: -1 })
      .lean();
      
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
    const analysers = await LabAnalyser.find().sort({ name: 1 }).lean();
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
      .sort({ createdAt: -1 })
      .lean();
      
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
