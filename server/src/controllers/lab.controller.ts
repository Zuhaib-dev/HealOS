import { Request, Response } from "express";
import {
  DiagnosticOrder,
  DiagnosticReport,
  LabAnalyser,
  Invoice,
  InvoiceStatus,
} from "../models/index.js";
import { getIO } from "../socket.js";
import { AppError } from "../middleware/error-handler.js";
import fs from "fs";
import ImageKit from "imagekit";
import {
  createOrGetDiagnosticInvoice,
  recordDiagnosticCashPayment,
} from "../utils/diagnostic-billing.js";

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_key",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_key",
  urlEndpoint:
    process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/your_endpoint",
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
    if (order.testType !== "PATHOLOGY") {
      fs.unlinkSync(file.path);
      throw new AppError("Only pathology orders can be reported here", 400);
    }
    if (order.status !== "IN_PROGRESS") {
      fs.unlinkSync(file.path);
      throw new AppError(
        "Collect and process this sample before uploading a result",
        409,
      );
    }
    const invoice = order.invoice
      ? await Invoice.findById(order.invoice)
      : null;
    if (
      !invoice ||
      invoice.status !== InvoiceStatus.PAID ||
      (invoice.paidAmount || 0) + (invoice.insuranceCoverage || 0) <
        invoice.totalAmount
    ) {
      fs.unlinkSync(file.path);
      throw new AppError(
        "A fully paid invoice is required before reporting",
        409,
      );
    }

    let fileUrl = "";
    let localFileName: string | undefined;
    if (file) {
      try {
        if (
          process.env.IMAGEKIT_PUBLIC_KEY &&
          process.env.IMAGEKIT_PUBLIC_KEY !== "public_key"
        ) {
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
          localFileName = file.filename;
          fileUrl = "/api/v1/reports/LOCAL_FILE_ID/file";
        }
      } catch (err) {
        console.warn("Cloud upload failed, falling back to local file...", err);
        localFileName = file.filename;
        fileUrl = "/api/v1/reports/LOCAL_FILE_ID/file";
      }
    }

    const report = await DiagnosticReport.create({
      patient: order.patient,
      order: order._id,
      uploadedBy,
      fileUrl,
      ...(localFileName ? { localFileName } : {}),
      fileName: file.originalname,
      title: "Lab Result - " + order.testName,
      state: "pending sign",
    });
    if (localFileName) {
      report.fileUrl = `/api/v1/reports/${report._id}/file`;
      await report.save();
    }

    order.status = "REPORTED" as any;
    order.reportedAt = new Date();
    await order.save();
    getIO()
      .to("lab_technician")
      .emit("lab_collection_updated", { orderId: order._id });

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
    const page = Math.max(
      1,
      Math.min(100_000, Number.parseInt(req.query.page as string, 10) || 1),
    );
    const limit = Math.max(
      1,
      Math.min(100, Number.parseInt(req.query.limit as string, 10) || 10),
    );
    const search = String(req.query.search || "")
      .trim()
      .slice(0, 100);
    const skip = (page - 1) * limit;

    // Optional: Filter by 'state: "released"' if you only want fully verified reports,
    // or just fetch all diagnostic reports.
    const pathologyOrderIds = await DiagnosticOrder.find({
      testType: "PATHOLOGY",
    }).distinct("_id");
    let filter: Record<string, unknown> = { order: { $in: pathologyOrderIds } };

    // We cannot easily text search across populated fields in a single basic find,
    // but we can search by title or fileName. In a real app, you'd aggregate.
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter = { ...filter, title: { $regex: escapedSearch, $options: "i" } };
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
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error fetching lab history" });
  }
};

export const getCollections = async (_req: Request, res: Response) => {
  try {
    const orders = await DiagnosticOrder.find({
      testType: "PATHOLOGY",
      status: { $in: ["PENDING", "IN_PROGRESS"] },
    })
      .populate("patient", "name mrn phone")
      .populate(
        "invoice",
        "totalAmount paidAmount insuranceCoverage status paymentMethod",
      )
      .sort({ createdAt: 1 })
      .lean();

    const priorityRank: Record<string, number> = {
      STAT: 0,
      URGENT: 1,
      ROUTINE: 2,
    };
    orders.sort(
      (a, b) =>
        (priorityRank[String(a.priority)] ?? 3) -
          (priorityRank[String(b.priority)] ?? 3) ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
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
    if (
      order.testType !== "PATHOLOGY" ||
      order.status === "CANCELLED" ||
      order.status === "REPORTED"
    )
      throw new AppError(
        "This order cannot be billed from the lab collection queue",
        409,
      );
    const invoice = await createOrGetDiagnosticInvoice(
      order,
      req.user?._id,
      price,
    );

    res.status(201).json({ success: true, invoice });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create bill",
    });
  }
};

export const markCollected = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await DiagnosticOrder.findById(id);
    if (!order) throw new AppError("Diagnostic order not found", 404);
    if (order.testType !== "PATHOLOGY")
      throw new AppError("Only pathology orders can be collected here", 400);
    if (!["PENDING", "IN_PROGRESS"].includes(order.status))
      throw new AppError("This order is no longer awaiting collection", 409);
    if (req.body?.price !== undefined) {
      // Collection is not payment. Create/reuse a pending invoice for payment through billing.
      await createOrGetDiagnosticInvoice(order, req.user?._id, req.body.price);
    }
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
        "The patient invoice must be fully paid before collection",
        409,
      );
    }
    if (order.status === "PENDING") order.status = "IN_PROGRESS" as any;
    if (!order.collectedAt) order.collectedAt = new Date();
    await order.save();

    getIO()
      .to("lab_technician")
      .emit("lab_collection_updated", { orderId: order._id });

    res.status(200).json({ success: true, order });
  } catch (error: any) {
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

export const recordLabCashPayment = async (req: Request, res: Response) => {
  try {
    const order = await DiagnosticOrder.findById(req.params.id);
    if (!order) throw new AppError("Diagnostic order not found", 404);
    if (order.testType !== "PATHOLOGY")
      throw new AppError("This is not a pathology order", 400);
    if (!["PENDING", "IN_PROGRESS"].includes(order.status))
      throw new AppError("Cash cannot be recorded for a closed order", 409);
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

export const getSamples = async (_req: Request, res: Response) => {
  try {
    const samples = await DiagnosticOrder.find({
      testType: "PATHOLOGY",
      status: { $in: ["IN_PROGRESS", "REPORTED", "CANCELLED"] },
    })
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
    const validReports = reports.filter((r) => r.order !== null);

    res.status(200).json({ success: true, pending: validReports });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const validateReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await DiagnosticReport.findById(id);
    if (!report) throw new AppError("Report not found", 404);
    if (report.state !== "pending sign")
      throw new AppError("Only pending reports can be released", 409);
    const order = report.order
      ? await DiagnosticOrder.findById(report.order)
      : null;
    if (!order || order.testType !== "PATHOLOGY" || order.status !== "REPORTED")
      throw new AppError(
        "Only completed pathology reports can be released here",
        409,
      );
    if (
      report.isCritical &&
      (!report.criticalCallback?.readBackConfirmed ||
        !report.criticalCallback.clinician?.trim())
    )
      throw new AppError(
        "Record and confirm the critical-result read-back before release",
        409,
      );
    const releasedReport = await DiagnosticReport.findOneAndUpdate(
      { _id: id, state: "pending sign" },
      { $set: { state: "verified" } },
      { new: true },
    );
    if (!releasedReport)
      throw new AppError("This report was already released", 409);

    const io = getIO();
    io.to("lab_technician").emit("lab_report_validated", {
      reportId: releasedReport._id,
    });
    io.to(`user:${releasedReport.patient}`).emit("lab_report_validated", {
      reportId: releasedReport._id,
    });
    io.to(`user:${order.doctor}`).emit("lab_report_validated", {
      reportId: releasedReport._id,
    });

    res.status(200).json({ success: true, report: releasedReport });
  } catch (error: any) {
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

export const recordCriticalCallback = async (req: Request, res: Response) => {
  try {
    const clinician =
      typeof req.body?.clinician === "string" ? req.body.clinician.trim() : "";
    if (
      !clinician ||
      clinician.length > 160 ||
      req.body?.readBackConfirmed !== true
    )
      throw new AppError("Enter the clinician and confirm read-back", 400);
    const candidate = await DiagnosticReport.findById(req.params.id).select(
      "order isCritical state",
    );
    const order = candidate?.order
      ? await DiagnosticOrder.findById(candidate.order).select("testType")
      : null;
    if (
      !candidate ||
      !candidate.isCritical ||
      candidate.state !== "pending sign" ||
      order?.testType !== "PATHOLOGY"
    )
      throw new AppError("Pending critical pathology result not found", 404);
    const report = await DiagnosticReport.findOneAndUpdate(
      {
        _id: req.params.id,
        isCritical: true,
        state: "pending sign",
        "criticalCallback.calledAt": { $exists: false },
      },
      {
        $set: {
          criticalCallback: {
            clinician,
            readBackConfirmed: true,
            calledAt: new Date(),
            recordedBy: req.user?._id,
          },
        },
      },
      { new: true, runValidators: true },
    );
    if (!report)
      throw new AppError(
        "Critical result not found, already released, or callback already recorded",
        409,
      );
    getIO()
      .to("lab_technician")
      .emit("lab_critical_callback_recorded", { reportId: report._id });
    res.status(200).json({ success: true, report });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to record callback",
    });
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
    const criticals = await DiagnosticReport.find({
      isCritical: true,
      state: "pending sign",
    })
      .populate({ path: "order", match: { testType: "PATHOLOGY" } })
      .populate("patient", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      criticalValues: criticals.filter((c) => c.order !== null),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getLabStats = async (_req: Request, res: Response) => {
  try {
    const pendingCount = await DiagnosticOrder.countDocuments({
      testType: "PATHOLOGY",
      status: "PENDING",
    });
    const inProgressCount = await DiagnosticOrder.countDocuments({
      testType: "PATHOLOGY",
      status: "IN_PROGRESS",
    });
    const pathologyOrderIds = await DiagnosticOrder.find({
      testType: "PATHOLOGY",
    }).distinct("_id");
    const criticalCount = await DiagnosticReport.countDocuments({
      isCritical: true,
      state: "pending sign",
      order: { $in: pathologyOrderIds },
    });

    res.status(200).json({
      success: true,
      stats: {
        pendingCollections: pendingCount,
        inProgressSamples: inProgressCount,
        criticalFlags: criticalCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
