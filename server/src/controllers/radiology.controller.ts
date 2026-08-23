import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { DiagnosticOrder, DiagnosticReport } from "../models/index.js";
import { AppError } from "../middleware/error-handler.js";
import ImageKit from "imagekit";

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_key",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_key",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/your_endpoint"
});

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads", "reports");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

// ==========================================
// 1. Get Pending/All Orders
// ==========================================
export const getOrders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const orders = await DiagnosticOrder.find({ testType: "RADIOLOGY" })
      .populate("patient", "firstName lastName dateOfBirth gender phone")
      .populate("doctor", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.status(200).json({
      status: "success",
      data: { orders },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to fetch orders",
    });
  }
};

// ==========================================
// 2. Update Order Status
// ==========================================
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new AppError("Status is required", 400);
    }

    const order = await DiagnosticOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!order) {
      throw new AppError("Diagnostic order not found", 404);
    }

    res.status(200).json({
      status: "success",
      data: { order },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to update order status",
    });
  }
};

// ==========================================
// 3. Upload Report
// ==========================================
export const uploadReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const uploadedBy = req.user?.id;
    const file = req.file;
    const { comments } = req.body;

    if (!file) {
      throw new AppError("Please upload a PDF file", 400);
    }

    const order = await DiagnosticOrder.findById(id);
    if (!order) {
      // Remove file if order doesn't exist
      fs.unlinkSync(file.path);
      throw new AppError("Diagnostic order not found", 404);
    }

    let fileUrl = "";
    if (file) {
      const fileBuffer = await fs.promises.readFile(file.path);
      const uploadResponse = await imagekit.upload({
        file: fileBuffer,
        fileName: `radiology_report_${order._id}_${Date.now()}`,
        folder: "/hms/reports",
      });
      fileUrl = uploadResponse.url;
      fs.unlinkSync(file.path);
    }

    const report = await DiagnosticReport.create({
      patient: order.patient,
      order: order._id,
      uploadedBy,
      fileUrl,
      fileName: file.originalname,
      comments,
    });

    order.status = "REPORTED" as any;
    await order.save();

    res.status(201).json({
      status: "success",
      data: { report, order },
    });
  } catch (error: any) {
    if (req.file) {
      fs.unlinkSync(req.file.path); // cleanup on error
    }
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to upload report",
    });
  }
};

// ==========================================
// 4. Get Documents (Reports)
// ==========================================
export const getDocuments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const documents = await DiagnosticReport.find()
      .populate("patient", "firstName lastName")
      .populate("radiologist", "firstName lastName")
      .populate("order", "accessionNumber testName")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.status(200).json({
      status: "success",
      data: { documents },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to fetch documents",
    });
  }
};

// ==========================================
// 5. Get Report Templates
// ==========================================
export const getTemplates = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { ReportTemplate } = await import("../models/index.js");
    const templates = await ReportTemplate.find().lean();
    res.status(200).json({ status: "success", data: { templates } });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ==========================================
// 6. Get Modalities
// ==========================================
export const getModalities = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { ModalityMachine } = await import("../models/index.js");
    const modalities = await ModalityMachine.find().lean();
    res.status(200).json({ status: "success", data: { modalities } });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ==========================================
// 7. Get Critical Findings
// ==========================================
export const getCriticalFindings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { CriticalFinding } = await import("../models/index.js");
    const findings = await CriticalFinding.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ status: "success", data: { findings } });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ==========================================
// 8. Get Bookings
// ==========================================
export const getBookings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { RadiologyBooking } = await import("../models/index.js");
    const bookings = await RadiologyBooking.find().sort({ time: 1 }).lean();
    res.status(200).json({ status: "success", data: { bookings } });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ==========================================
// 9. Get Stats
// ==========================================
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalOrders = await DiagnosticOrder.countDocuments({ testType: "RADIOLOGY" });
    const pendingOrders = await DiagnosticOrder.countDocuments({ testType: "RADIOLOGY", status: { $in: ["PENDING", "IN_PROGRESS"] } });
    const stats = [
      { label: "Studies today", value: totalOrders.toString(), note: `${pendingOrders} remaining` },
      { label: "Median report TAT", value: "24m", note: "stat SLA 30m" },
      { label: "Unreported backlog", value: pendingOrders.toString(), note: "—" },
      { label: "Reject / repeat rate", value: "1.8%", note: "target < 3%" },
    ];
    res.status(200).json({ status: "success", data: { stats } });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
