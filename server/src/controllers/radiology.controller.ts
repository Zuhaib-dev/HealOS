import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  DiagnosticOrder,
  DiagnosticReport,
  Invoice,
  InvoiceStatus,
} from "../models/index.js";
import { AppError } from "../middleware/error-handler.js";
import ImageKit from "imagekit";
import {
  createOrGetDiagnosticInvoice,
  recordDiagnosticCashPayment,
} from "../utils/diagnostic-billing.js";
import { DiagnosticOrderStatus } from "../models/diagnostic-order.model.js";

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_key",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_key",
  urlEndpoint:
    process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/your_endpoint",
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
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          "Invalid file type. Only PDF, JPG, and PNG are allowed.",
          400,
        ),
      );
    }
  },
});

// ==========================================
// 1. Get Pending/All Orders
// ==========================================
export const getOrders = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const orders = await DiagnosticOrder.find({ testType: "RADIOLOGY" })
      .populate("patient", "name phone")
      .populate("emergencyCase", "caseId patientName age sex")
      .populate("doctor", "name")
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
// 1.5 Create Radiology Bill
// ==========================================
export const createRadiologyBill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await DiagnosticOrder.findById(id);
    if (!order) throw new AppError("Order not found", 404);
    if (order.testType !== "RADIOLOGY")
      throw new AppError("This is not a radiology order", 400);
    const invoice = await createOrGetDiagnosticInvoice(
      order,
      req.user?._id,
      req.body.price,
    );

    res.status(201).json({ success: true, invoice });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create bill",
    });
  }
};

// ==========================================
// 2. Update Order Status
// ==========================================
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, price } = req.body;

    if (!Object.values(DiagnosticOrderStatus).includes(status)) {
      throw new AppError("Choose a valid order status", 400);
    }
    const order = await DiagnosticOrder.findById(id);
    if (!order) {
      throw new AppError("Diagnostic order not found", 404);
    }
    if (order.testType !== "RADIOLOGY")
      throw new AppError("This is not a radiology order", 400);
    if (
      order.status === DiagnosticOrderStatus.CANCELLED &&
      status !== DiagnosticOrderStatus.CANCELLED
    )
      throw new AppError("Cancelled orders cannot be reopened", 409);
    if (status === DiagnosticOrderStatus.IN_PROGRESS) {
      const invoice = order.invoice
        ? await Invoice.findById(order.invoice)
        : null;
      if (
        !invoice ||
        invoice.status !== InvoiceStatus.PAID ||
        (invoice.paidAmount || 0) + (invoice.insuranceCoverage || 0) <
          invoice.totalAmount
      ) {
        throw new AppError(
          "The patient invoice must be fully paid before the scan starts",
          409,
        );
      }
    }
    if (status === DiagnosticOrderStatus.CANCELLED && order.invoice) {
      const invoice = await Invoice.findById(order.invoice);
      if (invoice?.status === InvoiceStatus.PAID)
        throw new AppError(
          "A paid order cannot be cancelled; issue a refund through billing",
          409,
        );
      if (invoice) {
        invoice.status = InvoiceStatus.CANCELLED;
        await invoice.save();
      }
    }
    // Legacy callers may still send a price here. That creates a pending invoice only;
    // this route never records a cash or online payment.
    if (price !== undefined && !order.invoice)
      await createOrGetDiagnosticInvoice(order, req.user?._id, price);
    order.status = status;
    await order.save();

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

export const recordRadiologyCashPayment = async (
  req: Request,
  res: Response,
) => {
  try {
    const order = await DiagnosticOrder.findById(req.params.id);
    if (!order) throw new AppError("Diagnostic order not found", 404);
    if (order.testType !== "RADIOLOGY")
      throw new AppError("This is not a radiology order", 400);
    const invoice = await recordDiagnosticCashPayment(
      String(req.params.id || ""),
      req.user?._id,
    );
    res.json({ success: true, invoice });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to record cash payment",
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
    let localFileName: string | undefined;
    if (file) {
      try {
        const fileBuffer = await fs.promises.readFile(file.path);
        const uploadResponse = await imagekit.upload({
          file: fileBuffer,
          fileName: `radiology_report_${order._id}_${Date.now()}`,
          folder: "/hms/reports",
        });
        fileUrl = uploadResponse.url;
        fs.unlinkSync(file.path);
      } catch (uploadError) {
        console.warn(
          "Radiology cloud upload failed; keeping a private local copy",
          uploadError,
        );
        localFileName = file.filename;
        fileUrl = "/api/v1/reports/LOCAL_FILE_ID/file";
      }
    }

    const report = await DiagnosticReport.create({
      ...(order.patient ? { patient: order.patient } : {}),
      ...(order.emergencyCase ? { emergencyCase: order.emergencyCase } : {}),
      order: order._id,
      uploadedBy,
      fileUrl,
      ...(localFileName ? { localFileName } : {}),
      fileName: file.originalname,
      comments,
      state: "verified",
    });
    if (localFileName) {
      report.fileUrl = `/api/v1/reports/${report._id}/file`;
      await report.save();
    }

    order.status = "REPORTED" as any;
    await order.save();

    res.status(201).json({
      status: "success",
      data: { report, order },
    });
  } catch (error: any) {
    if (req.file) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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
export const getDocuments = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const radiologyOrderIds = await DiagnosticOrder.find({
      testType: "RADIOLOGY",
    }).distinct("_id");
    const documents = await DiagnosticReport.find({
      order: { $in: radiologyOrderIds },
    })
      .populate("patient", "name")
      .populate("emergencyCase", "caseId patientName")
      .populate("radiologist", "name")
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
export const getTemplates = async (
  _req: Request,
  res: Response,
): Promise<void> => {
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
export const getModalities = async (
  _req: Request,
  res: Response,
): Promise<void> => {
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
export const getCriticalFindings = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { CriticalFinding } = await import("../models/index.js");
    const findings = await CriticalFinding.find()
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ status: "success", data: { findings } });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// ==========================================
// 8. Get Bookings
// ==========================================
export const getBookings = async (
  _req: Request,
  res: Response,
): Promise<void> => {
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
    const totalOrders = await DiagnosticOrder.countDocuments({
      testType: "RADIOLOGY",
    });
    const pendingOrders = await DiagnosticOrder.countDocuments({
      testType: "RADIOLOGY",
      status: { $in: ["PENDING", "IN_PROGRESS"] },
    });
    const stats = [
      {
        label: "Studies today",
        value: totalOrders.toString(),
        note: `${pendingOrders} remaining`,
      },
      { label: "Median report TAT", value: "24m", note: "stat SLA 30m" },
      {
        label: "Unreported backlog",
        value: pendingOrders.toString(),
        note: "—",
      },
      { label: "Reject / repeat rate", value: "1.8%", note: "target < 3%" },
    ];
    res.status(200).json({ status: "success", data: { stats } });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
