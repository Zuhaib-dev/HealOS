import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { DiagnosticOrder, DiagnosticReport } from "../models/index.js";
import { AppError } from "../middleware/error-handler.js";

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
export const getOrders = async (req: Request, res: Response) => {
  try {
    const orders = await DiagnosticOrder.find()
      .populate("patient", "firstName lastName dateOfBirth gender phone")
      .populate("doctor", "firstName lastName")
      .sort({ createdAt: -1 });

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

    const fileUrl = `/uploads/reports/${file.filename}`;

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
