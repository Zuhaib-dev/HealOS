import { Request, Response } from "express";
import {
  DiagnosticOrder,
  DiagnosticReport,
  LabAnalyser,
  LabAnalyte,
  LabCriticalContact,
  Invoice,
  InvoiceStatus,
} from "../models/index.js";
import { getIO } from "../socket.js";
import { AppError } from "../middleware/error-handler.js";
import fs from "fs";
import ImageKit from "imagekit";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import {
  createOrGetDiagnosticInvoice,
  recordDiagnosticCashPayment,
} from "../utils/diagnostic-billing.js";
import {
  generateSpecimenBarcode,
  SpecimenStatus,
} from "../models/diagnostic-order.model.js";

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_key",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_key",
  urlEndpoint:
    process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/your_endpoint",
});

const hashIntegrationToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

function appendSpecimenEvent(
  order: any,
  event: string,
  performedBy: unknown,
  note?: string,
  barcode = order.specimenBarcode,
) {
  order.specimenHistory.push({
    event,
    barcode,
    note: note?.trim(),
    performedBy,
    at: new Date(),
  });
}

function hasCurrentAnalyserQC(analyser: any) {
  return Boolean(
    analyser.qcStatus === "PASS" &&
    analyser.qcLastPassedAt &&
    Date.now() - new Date(analyser.qcLastPassedAt).getTime() <=
      analyser.qcIntervalHours * 60 * 60 * 1000,
  );
}

function getResultFlag(value: number, analyte: any) {
  if (analyte.criticalLow !== undefined && value <= analyte.criticalLow)
    return "CRITICAL_LOW" as const;
  if (analyte.criticalHigh !== undefined && value >= analyte.criticalHigh)
    return "CRITICAL_HIGH" as const;
  if (analyte.referenceLow === undefined || analyte.referenceHigh === undefined)
    return "UNREVIEWED" as const;
  if (value < analyte.referenceLow) return "LOW" as const;
  if (value > analyte.referenceHigh) return "HIGH" as const;
  return "NORMAL" as const;
}

async function ensureSpecimenIdentity(order: any) {
  let changed = false;
  if (!order.specimenBarcode) {
    order.specimenBarcode = generateSpecimenBarcode();
    changed = true;
  }
  if (!order.specimenStatus) {
    order.specimenStatus =
      order.status === "REPORTED"
        ? SpecimenStatus.COMPLETED
        : order.status === "IN_PROGRESS"
          ? SpecimenStatus.COLLECTED
          : order.status === "CANCELLED"
            ? SpecimenStatus.CANCELLED
            : SpecimenStatus.AWAITING_COLLECTION;
    changed = true;
  }
  if (order.specimenStatus === SpecimenStatus.AWAITING_COLLECTION) {
    const migratedStatus =
      order.status === "REPORTED"
        ? SpecimenStatus.COMPLETED
        : order.status === "IN_PROGRESS"
          ? SpecimenStatus.COLLECTED
          : order.status === "CANCELLED"
            ? SpecimenStatus.CANCELLED
            : null;
    if (migratedStatus) {
      order.specimenStatus = migratedStatus;
      changed = true;
    }
  }
  if (!order.specimenHistory) {
    order.specimenHistory = [];
    changed = true;
  }
  if (changed) await order.save();
  return order;
}

async function persistStructuredResults(
  order: any,
  inputResults: any[],
  source: "MANUAL" | "INSTRUMENT",
  actor: unknown,
  analyser?: any,
) {
  if (
    !Array.isArray(inputResults) ||
    inputResults.length === 0 ||
    inputResults.length > 100
  )
    throw new AppError("Provide between 1 and 100 analyte results", 400);
  if (!order || order.testType !== "PATHOLOGY")
    throw new AppError("Pathology order not found", 404);
  if (
    ![SpecimenStatus.PROCESSING, SpecimenStatus.RECEIVED].includes(
      order.specimenStatus,
    )
  )
    throw new AppError(
      "Receive and assign this specimen before entering results",
      409,
    );
  if (order.status === "CANCELLED" || order.status === "REPORTED")
    throw new AppError("This order is already closed", 409);

  const invoice = order.invoice ? await Invoice.findById(order.invoice) : null;
  if (
    !invoice ||
    invoice.status !== InvoiceStatus.PAID ||
    (invoice.paidAmount || 0) + (invoice.insuranceCoverage || 0) <
      invoice.totalAmount
  )
    throw new AppError(
      "A fully paid invoice is required before result entry",
      409,
    );

  if (
    source === "INSTRUMENT" &&
    (!analyser || String(order.analyser) !== String(analyser._id))
  )
    throw new AppError("The specimen is not assigned to this analyser", 409);
  if (source === "INSTRUMENT" && !hasCurrentAnalyserQC(analyser))
    throw new AppError(
      "Analyzer QC is failed or expired; result import is blocked",
      409,
    );

  const codes = inputResults.map((item) =>
    String(item?.analyteCode || "")
      .trim()
      .toUpperCase(),
  );
  if (codes.some((code) => !code) || new Set(codes).size !== codes.length)
    throw new AppError("Each result must have a unique analyte code", 400);
  const definitions = await LabAnalyte.find({
    code: { $in: codes },
    active: true,
  }).lean();
  const definitionByCode = new Map(
    definitions.map((definition) => [definition.code, definition]),
  );
  if (definitions.length !== codes.length)
    throw new AppError("One or more analyte codes are not configured", 400);

  const priorReports = await DiagnosticReport.find({
    ...(order.patient
      ? { patient: order.patient }
      : { emergencyCase: order.emergencyCase }),
    state: "verified",
    order: { $ne: order._id },
    "structuredResults.analyteCode": { $in: codes },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("structuredResults order createdAt")
    .lean();
  const previousByCode = new Map<string, number>();
  for (const prior of priorReports) {
    for (const result of prior.structuredResults || []) {
      if (
        codes.includes(result.analyteCode) &&
        result.numericValue !== undefined &&
        !previousByCode.has(result.analyteCode)
      )
        previousByCode.set(result.analyteCode, result.numericValue);
    }
  }

  let report = await DiagnosticReport.findOne({ order: order._id }).sort({
    createdAt: -1,
  });
  if (report?.state === "verified")
    throw new AppError(
      "A released report cannot be changed; create an amendment workflow",
      409,
    );
  if (!report) {
    report = await DiagnosticReport.create({
      ...(order.patient ? { patient: order.patient } : {}),
      ...(order.emergencyCase ? { emergencyCase: order.emergencyCase } : {}),
      order: order._id,
      uploadedBy: actor,
      title: `Lab Result - ${order.testName}`,
      state: "pending sign",
      structuredResults: [],
    });
  }

  const currentResults = [...(report.structuredResults || [])];
  const now = new Date();
  for (const item of inputResults) {
    const code = String(item.analyteCode).trim().toUpperCase();
    const definition = definitionByCode.get(code)!;
    const numericValue = Number(item.value);
    if (
      item.value === undefined ||
      item.value === null ||
      item.value === "" ||
      !Number.isFinite(numericValue)
    )
      throw new AppError(`Enter a numeric result for ${definition.name}`, 400);
    const externalResultId =
      typeof item.externalResultId === "string"
        ? item.externalResultId.trim().slice(0, 120)
        : undefined;
    if (
      externalResultId &&
      currentResults.some(
        (result) =>
          result.externalResultId === externalResultId &&
          result.analyser?.toString() === String(analyser?._id),
      )
    )
      continue;
    const flag = getResultFlag(numericValue, definition);
    const previousValue = previousByCode.get(definition.code);
    const deltaPercent =
      previousValue === undefined || previousValue === 0
        ? undefined
        : Math.round(
            (Math.abs(numericValue - previousValue) / Math.abs(previousValue)) *
              10000,
          ) / 100;
    const savedResult = {
      analyteCode: definition.code,
      analyteName: definition.name,
      value: String(item.value).trim().slice(0, 80),
      numericValue,
      unit: definition.unit,
      referenceLow: definition.referenceLow,
      referenceHigh: definition.referenceHigh,
      criticalLow: definition.criticalLow,
      criticalHigh: definition.criticalHigh,
      flag,
      ...(previousValue !== undefined ? { previousValue } : {}),
      ...(deltaPercent !== undefined ? { deltaPercent } : {}),
      ...(definition.deltaPercent !== undefined && deltaPercent !== undefined
        ? { deltaExceeded: deltaPercent >= definition.deltaPercent }
        : {}),
      source,
      ...(analyser ? { analyser: analyser._id } : {}),
      ...(externalResultId ? { externalResultId } : {}),
      resultAt:
        item.resultAt && !Number.isNaN(Date.parse(item.resultAt))
          ? new Date(item.resultAt)
          : now,
      ...(actor ? { enteredBy: actor } : {}),
    };
    const index = currentResults.findIndex(
      (result) => result.analyteCode === definition.code,
    );
    if (index >= 0) currentResults[index] = savedResult as any;
    else currentResults.push(savedResult as any);
  }

  report.structuredResults = currentResults as any;
  report.isCritical = currentResults.some(
    (result) =>
      result.flag === "CRITICAL_LOW" || result.flag === "CRITICAL_HIGH",
  );
  report.findings = currentResults
    .map(
      (result) =>
        `${result.analyteName}: ${result.value} ${result.unit || ""} (${result.flag})`,
    )
    .join("; ")
    .slice(0, 2000);
  report.uploadedBy = actor as string;
  report.state = "pending sign";
  if (report.isCritical && !report.criticalDueAt)
    report.criticalDueAt = new Date(now.getTime() + 15 * 60 * 1000);
  await report.save();

  order.status = "REPORTED";
  order.specimenStatus = SpecimenStatus.COMPLETED;
  order.reportedAt = now;
  appendSpecimenEvent(
    order,
    source === "INSTRUMENT" ? "RESULTS_IMPORTED" : "RESULTS_ENTERED",
    actor,
  );
  await order.save();
  getIO()
    .to("lab_technician")
    .emit("lab_collection_updated", { orderId: order._id });
  getIO()
    .to("lab_technician")
    .emit("lab_results_imported", { reportId: report._id });
  return report;
}

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

    const report =
      (await DiagnosticReport.findOne({
        order: order._id,
        state: "pending sign",
      }).sort({ createdAt: -1 })) ||
      new DiagnosticReport({
        ...(order.patient ? { patient: order.patient } : {}),
        ...(order.emergencyCase ? { emergencyCase: order.emergencyCase } : {}),
        order: order._id,
        title: "Lab Result - " + order.testName,
        state: "pending sign",
      });
    report.uploadedBy = uploadedBy;
    report.fileUrl = fileUrl;
    report.localFileName = localFileName;
    report.fileName = file.originalname;
    report.isCritical = Boolean(
      report.isCritical || req.body?.isCritical === "true",
    );
    if (report.isCritical && !report.criticalDueAt)
      report.criticalDueAt = new Date(Date.now() + 15 * 60_000);
    await report.save();
    if (localFileName) {
      report.fileUrl = `/api/v1/reports/${report._id}/file`;
      await report.save();
    }

    order.status = "REPORTED" as any;
    order.reportedAt = new Date();
    order.specimenStatus = SpecimenStatus.COMPLETED;
    appendSpecimenEvent(order, "REPORT_UPLOADED", uploadedBy);
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
      .populate("emergencyCase", "caseId patientName")
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
    }).sort({ createdAt: 1 });
    for (const order of orders) await ensureSpecimenIdentity(order);
    await DiagnosticOrder.populate(orders, [
      { path: "patient", select: "name mrn phone" },
      { path: "emergencyCase", select: "caseId patientName age sex" },
      {
        path: "invoice",
        select: "totalAmount paidAmount insuranceCoverage status paymentMethod",
      },
    ]);

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
    const barcode = String(req.body?.barcode || "")
      .trim()
      .toUpperCase();
    if (!order.specimenBarcode || barcode !== order.specimenBarcode)
      throw new AppError("Scan or enter the current specimen barcode", 400);
    if (
      order.specimenStatus !== SpecimenStatus.AWAITING_COLLECTION &&
      order.specimenStatus !== SpecimenStatus.RECOLLECTION_REQUIRED
    )
      throw new AppError("This specimen is not awaiting collection", 409);
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
    order.specimenStatus = SpecimenStatus.COLLECTED;
    appendSpecimenEvent(
      order,
      order.recollectionCount ? "RECOLLECTED" : "COLLECTED",
      req.user?._id,
    );
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

export const receiveSpecimen = async (req: Request, res: Response) => {
  try {
    const barcode = String(req.body?.barcode || "")
      .trim()
      .toUpperCase();
    if (!barcode) throw new AppError("Scan the specimen barcode", 400);
    const order = await DiagnosticOrder.findById(req.params.id);
    if (!order || order.testType !== "PATHOLOGY")
      throw new AppError("Pathology order not found", 404);
    if (order.specimenBarcode !== barcode)
      throw new AppError(
        "Barcode does not match this order's active specimen",
        409,
      );
    if (order.specimenStatus !== SpecimenStatus.COLLECTED)
      throw new AppError("Only collected specimens can be received", 409);
    order.specimenStatus = SpecimenStatus.RECEIVED;
    order.receivedAt = new Date();
    appendSpecimenEvent(order, "RECEIVED", req.user?._id);
    await order.save();
    getIO()
      .to("lab_technician")
      .emit("lab_collection_updated", { orderId: order._id });
    res.json({ success: true, order });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to receive specimen",
    });
  }
};

export const rejectSpecimen = async (req: Request, res: Response) => {
  try {
    const barcode = String(req.body?.barcode || "")
      .trim()
      .toUpperCase();
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!barcode || !reason || reason.length > 500)
      throw new AppError("Scan the barcode and enter a rejection reason", 400);
    const order = await DiagnosticOrder.findById(req.params.id);
    if (!order || order.testType !== "PATHOLOGY")
      throw new AppError("Pathology order not found", 404);
    if (order.specimenBarcode !== barcode)
      throw new AppError(
        "Barcode does not match this order's active specimen",
        409,
      );
    if (
      order.specimenStatus !== SpecimenStatus.COLLECTED &&
      order.specimenStatus !== SpecimenStatus.RECEIVED &&
      order.specimenStatus !== SpecimenStatus.PROCESSING
    )
      throw new AppError(
        "This specimen cannot be rejected at its current stage",
        409,
      );
    const rejectedBarcode = order.specimenBarcode;
    order.specimenStatus = SpecimenStatus.RECOLLECTION_REQUIRED;
    order.specimenBarcode = generateSpecimenBarcode();
    order.recollectionCount = (order.recollectionCount || 0) + 1;
    order.analyser = undefined;
    order.analyserAssignedAt = undefined;
    order.receivedAt = undefined;
    appendSpecimenEvent(
      order,
      "REJECTED",
      req.user?._id,
      reason,
      rejectedBarcode,
    );
    appendSpecimenEvent(
      order,
      "RECOLLECTION_REQUESTED",
      req.user?._id,
      reason,
      order.specimenBarcode,
    );
    await order.save();
    getIO()
      .to("lab_technician")
      .emit("lab_collection_updated", { orderId: order._id });
    res.json({ success: true, order });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to reject specimen",
    });
  }
};

export const recollectSpecimen = async (req: Request, res: Response) => {
  try {
    const barcode = String(req.body?.barcode || "")
      .trim()
      .toUpperCase();
    if (!barcode)
      throw new AppError("Scan the replacement specimen barcode", 400);
    const order = await DiagnosticOrder.findById(req.params.id);
    if (!order || order.testType !== "PATHOLOGY")
      throw new AppError("Pathology order not found", 404);
    if (
      order.specimenStatus !== SpecimenStatus.RECOLLECTION_REQUIRED ||
      order.specimenBarcode !== barcode
    )
      throw new AppError(
        "This order is not awaiting recollection with that barcode",
        409,
      );
    order.specimenStatus = SpecimenStatus.COLLECTED;
    order.status = "IN_PROGRESS" as any;
    if (!order.collectedAt) order.collectedAt = new Date();
    appendSpecimenEvent(order, "RECOLLECTED", req.user?._id);
    await order.save();
    getIO()
      .to("lab_technician")
      .emit("lab_collection_updated", { orderId: order._id });
    res.json({ success: true, order });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to record recollection",
    });
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
      $or: [
        {
          specimenStatus: {
            $in: [
              SpecimenStatus.COLLECTED,
              SpecimenStatus.RECEIVED,
              SpecimenStatus.RECOLLECTION_REQUIRED,
              SpecimenStatus.PROCESSING,
              SpecimenStatus.COMPLETED,
              SpecimenStatus.CANCELLED,
            ],
          },
        },
        {
          specimenStatus: { $exists: false },
          status: { $in: ["IN_PROGRESS", "REPORTED", "CANCELLED"] },
        },
      ],
    }).sort({ createdAt: -1 });
    for (const sample of samples) await ensureSpecimenIdentity(sample);
    await DiagnosticOrder.populate(samples, [
      { path: "patient", select: "name mrn phone" },
      { path: "emergencyCase", select: "caseId patientName age sex" },
      { path: "analyser", select: "name discipline" },
      { path: "specimenHistory.performedBy", select: "name" },
    ]);

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
      .populate("emergencyCase", "caseId patientName")
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
    if (releasedReport.patient) {
      io.to(`user:${releasedReport.patient}`).emit("lab_report_validated", {
        reportId: releasedReport._id,
      });
    }
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
    const contact = req.body?.contactId
      ? await LabCriticalContact.findOne({
          _id: req.body.contactId,
          active: true,
        })
      : null;
    const clinician =
      (typeof req.body?.clinician === "string"
        ? req.body.clinician.trim()
        : "") ||
      contact?.name ||
      "";
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    const escalationLevel = Number(req.body?.escalationLevel || 1);
    if (
      !clinician ||
      clinician.length > 160 ||
      req.body?.readBackConfirmed !== true ||
      !Number.isInteger(escalationLevel) ||
      escalationLevel < 1 ||
      escalationLevel > 20 ||
      (req.body?.contactId && !contact) ||
      note.length > 500
    )
      throw new AppError("Select a valid contact and confirm read-back", 400);
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
            ...(contact ? { contact: contact._id } : {}),
            readBackConfirmed: true,
            calledAt: new Date(),
            recordedBy: req.user?._id,
            ...(note ? { note } : {}),
            escalationLevel,
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
    const analysers = await LabAnalyser.find()
      .sort({ name: 1 })
      .select("-integrationTokenHash")
      .lean();
    const queue = await DiagnosticOrder.aggregate([
      {
        $match: {
          analyser: { $in: analysers.map((item) => item._id) },
          specimenStatus: {
            $in: [SpecimenStatus.RECEIVED, SpecimenStatus.PROCESSING],
          },
        },
      },
      { $group: { _id: "$analyser", count: { $sum: 1 } } },
    ]);
    const queueByAnalyser = new Map(
      queue.map((row) => [String(row._id), row.count]),
    );
    const now = Date.now();
    res.status(200).json({
      success: true,
      analysers: analysers.map((analyser) => ({
        ...analyser,
        queue: queueByAnalyser.get(String(analyser._id)) || 0,
        qcExpired:
          !analyser.qcLastPassedAt ||
          now - new Date(analyser.qcLastPassedAt).getTime() >
            analyser.qcIntervalHours * 60 * 60 * 1000,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createAnalyser = async (req: Request, res: Response) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const discipline =
      typeof req.body?.discipline === "string"
        ? req.body.discipline.trim()
        : "";
    if (!name || name.length > 100 || !discipline || discipline.length > 80)
      throw new AppError("Enter an analyser name and discipline", 400);
    const token = randomBytes(32).toString("base64url");
    const analyser = await LabAnalyser.create({
      name,
      discipline,
      connectionState: "OFFLINE",
      qcStatus: "DUE",
      qcIntervalHours: 24,
      integrationTokenHash: hashIntegrationToken(token),
    });
    const safeAnalyser = analyser.toObject();
    delete safeAnalyser.integrationTokenHash;
    res
      .status(201)
      .json({ success: true, analyser: safeAnalyser, integrationToken: token });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to create analyser",
    });
  }
};

export const rotateAnalyserToken = async (req: Request, res: Response) => {
  try {
    const analyser = await LabAnalyser.findById(req.params.id).select(
      "+integrationTokenHash",
    );
    if (!analyser) throw new AppError("Analyser not found", 404);
    const token = randomBytes(32).toString("base64url");
    analyser.integrationTokenHash = hashIntegrationToken(token);
    await analyser.save();
    res.json({ success: true, integrationToken: token });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to rotate integration token",
    });
  }
};

export const updateAnalyser = async (req: Request, res: Response) => {
  try {
    const analyser = await LabAnalyser.findById(req.params.id);
    if (!analyser) throw new AppError("Analyser not found", 404);
    if (typeof req.body?.name === "string")
      analyser.name = req.body.name.trim().slice(0, 100);
    if (typeof req.body?.discipline === "string")
      analyser.discipline = req.body.discipline.trim().slice(0, 80);
    if (
      ["ONLINE", "OFFLINE", "MAINTENANCE"].includes(req.body?.connectionState)
    )
      analyser.connectionState = req.body.connectionState;
    if (req.body?.qcIntervalHours !== undefined) {
      const interval = Number(req.body.qcIntervalHours);
      if (!Number.isInteger(interval) || interval < 1 || interval > 720)
        throw new AppError("QC interval must be from 1 to 720 hours", 400);
      analyser.qcIntervalHours = interval;
    }
    await analyser.save();
    res.json({ success: true, analyser: analyser.toObject() });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to update analyser",
    });
  }
};

export const recordAnalyserQC = async (req: Request, res: Response) => {
  try {
    const analyser = await LabAnalyser.findById(req.params.id);
    if (!analyser) throw new AppError("Analyser not found", 404);
    const controlLot =
      typeof req.body?.controlLot === "string"
        ? req.body.controlLot.trim()
        : "";
    if (
      !controlLot ||
      controlLot.length > 80 ||
      typeof req.body?.passed !== "boolean"
    )
      throw new AppError("Record a control lot and a pass/fail result", 400);
    const performedAt = new Date();
    analyser.qcRuns.push({
      passed: req.body.passed,
      controlLot,
      notes:
        typeof req.body.notes === "string"
          ? req.body.notes.trim().slice(0, 500)
          : undefined,
      performedBy: req.user?._id as any,
      performedAt,
    });
    analyser.qcStatus = req.body.passed ? "PASS" : "FAIL";
    if (req.body.passed) analyser.qcLastPassedAt = performedAt;
    await analyser.save();
    getIO()
      .to("lab_technician")
      .emit("lab_analyser_updated", { analyserId: analyser._id });
    res.json({ success: true, analyser });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to record analyser QC",
    });
  }
};

export const getAnalyserWorklist = async (req: Request, res: Response) => {
  try {
    const analyser = await LabAnalyser.findById(req.params.id);
    if (!analyser) throw new AppError("Analyser not found", 404);
    const orders = await DiagnosticOrder.find({
      analyser: analyser._id,
      specimenStatus: {
        $in: [SpecimenStatus.RECEIVED, SpecimenStatus.PROCESSING],
      },
    })
      .populate("patient", "name mrn")
      .populate("emergencyCase", "caseId patientName")
      .sort({ priority: 1, createdAt: 1 });
    res.json({ success: true, orders });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to load analyser worklist",
    });
  }
};

export const assignAnalyserWorklist = async (req: Request, res: Response) => {
  try {
    const analyser = await LabAnalyser.findById(req.params.id);
    if (!analyser) throw new AppError("Analyser not found", 404);
    if (
      analyser.connectionState !== "ONLINE" ||
      !hasCurrentAnalyserQC(analyser)
    )
      throw new AppError(
        "Set the analyser online and record valid QC before assigning samples",
        409,
      );
    const orderIds = Array.isArray(req.body?.orderIds)
      ? req.body.orderIds.slice(0, 100)
      : [];
    if (orderIds.length === 0)
      throw new AppError("Select at least one sample", 400);
    const orders = await DiagnosticOrder.find({
      _id: { $in: orderIds },
      testType: "PATHOLOGY",
    });
    if (orders.length !== new Set(orderIds.map(String)).size)
      throw new AppError("One or more selected orders were not found", 404);
    for (const order of orders) {
      if (
        order.specimenStatus !== SpecimenStatus.RECEIVED ||
        order.status !== "IN_PROGRESS"
      )
        throw new AppError(
          `Specimen ${order.specimenBarcode} is not received and ready for analysis`,
          409,
        );
      const invoice = order.invoice
        ? await Invoice.findById(order.invoice)
        : null;
      if (
        !invoice ||
        invoice.status !== InvoiceStatus.PAID ||
        (invoice.paidAmount || 0) + (invoice.insuranceCoverage || 0) <
          invoice.totalAmount
      )
        throw new AppError(
          `Specimen ${order.specimenBarcode} has an unpaid invoice`,
          409,
        );
    }
    for (const order of orders) {
      order.analyser = analyser._id;
      order.analyserAssignedAt = new Date();
      order.specimenStatus = SpecimenStatus.PROCESSING;
      appendSpecimenEvent(
        order,
        "ASSIGNED_TO_ANALYSER",
        req.user?._id,
        analyser.name,
      );
      await order.save();
    }
    getIO()
      .to("lab_technician")
      .emit("lab_analyser_updated", { analyserId: analyser._id });
    res.json({ success: true, assigned: orders.length });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to assign analyser worklist",
    });
  }
};

export const submitManualResults = async (req: Request, res: Response) => {
  try {
    const order = await DiagnosticOrder.findById(req.params.id);
    if (!order) throw new AppError("Diagnostic order not found", 404);
    const barcode = String(req.body?.barcode || "")
      .trim()
      .toUpperCase();
    if (!barcode || barcode !== order.specimenBarcode)
      throw new AppError(
        "Scan the active specimen barcode before entering results",
        409,
      );
    const report = await persistStructuredResults(
      order,
      req.body?.results,
      "MANUAL",
      req.user?._id,
    );
    res.status(201).json({ success: true, report, order });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to save results",
    });
  }
};

export const importAnalyserResults = async (req: Request, res: Response) => {
  try {
    const match = req.headers.authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match?.[1])
      throw new AppError("Analyzer integration token required", 401);
    const analyser = await LabAnalyser.findById(req.params.id).select(
      "+integrationTokenHash",
    );
    if (!analyser?.integrationTokenHash)
      throw new AppError("Analyzer integration is not configured", 401);
    const receivedHash = Buffer.from(hashIntegrationToken(match[1]));
    const expectedHash = Buffer.from(analyser.integrationTokenHash);
    if (
      receivedHash.length !== expectedHash.length ||
      !timingSafeEqual(receivedHash, expectedHash)
    )
      throw new AppError("Invalid analyzer integration token", 401);
    const barcode = String(req.body?.barcode || "")
      .trim()
      .toUpperCase();
    const order = barcode
      ? await DiagnosticOrder.findOne({
          testType: "PATHOLOGY",
          specimenBarcode: barcode,
        })
      : null;
    if (!order) throw new AppError("Specimen barcode not found", 404);
    const incomingIds = Array.isArray(req.body?.results)
      ? req.body.results
          .map((item: any) => String(item?.externalResultId || "").trim())
          .filter(Boolean)
      : [];
    if (order.status === "REPORTED" && incomingIds.length > 0) {
      const existing = await DiagnosticReport.findOne({
        order: order._id,
      }).sort({ createdAt: -1 });
      const existingIds = new Set(
        (existing?.structuredResults || [])
          .map((result) => result.externalResultId)
          .filter(Boolean),
      );
      if (incomingIds.every((id: string) => existingIds.has(id))) {
        analyser.lastSeenAt = new Date();
        analyser.connectionState = "ONLINE";
        await analyser.save();
        return res.status(200).json({
          success: true,
          duplicate: true,
          reportId: existing?._id,
          state: existing?.state,
        });
      }
    }
    const report = await persistStructuredResults(
      order,
      req.body?.results,
      "INSTRUMENT",
      analyser._id,
      analyser,
    );
    analyser.lastSeenAt = new Date();
    analyser.connectionState = "ONLINE";
    await analyser.save();
    res
      .status(201)
      .json({ success: true, reportId: report._id, state: report.state });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Analyzer result import failed",
    });
  }
};

export const getLabAnalytes = async (_req: Request, res: Response) => {
  try {
    const analytes = await LabAnalyte.find()
      .sort({ active: -1, name: 1 })
      .lean();
    res.json({ success: true, analytes });
  } catch {
    res
      .status(500)
      .json({ success: false, message: "Unable to load analyte definitions" });
  }
};

export const saveLabAnalyte = async (req: Request, res: Response) => {
  try {
    const code = String(req.body?.code || "")
      .trim()
      .toUpperCase();
    const name = String(req.body?.name || "").trim();
    const unit = String(req.body?.unit || "").trim();
    if (
      !/^[A-Z0-9_-]{2,32}$/.test(code) ||
      !name ||
      name.length > 100 ||
      !unit ||
      unit.length > 24
    )
      throw new AppError("Enter a valid code, analyte name, and unit", 400);
    const range = (key: string) =>
      req.body?.[key] === "" || req.body?.[key] == null
        ? undefined
        : Number(req.body[key]);
    const values = {
      referenceLow: range("referenceLow"),
      referenceHigh: range("referenceHigh"),
      criticalLow: range("criticalLow"),
      criticalHigh: range("criticalHigh"),
      deltaPercent: range("deltaPercent"),
    };
    if (
      Object.values(values).some(
        (value) => value !== undefined && !Number.isFinite(value),
      )
    )
      throw new AppError("Reference and critical limits must be numbers", 400);
    if (
      values.deltaPercent !== undefined &&
      (values.deltaPercent < 1 || values.deltaPercent > 1000)
    )
      throw new AppError("Delta threshold must be between 1% and 1000%", 400);
    if (
      values.referenceLow !== undefined &&
      values.referenceHigh !== undefined &&
      values.referenceLow >= values.referenceHigh
    )
      throw new AppError(
        "Reference lower limit must be below upper limit",
        400,
      );
    if (
      values.criticalLow !== undefined &&
      values.referenceLow !== undefined &&
      values.criticalLow > values.referenceLow
    )
      throw new AppError(
        "Critical low limit must not exceed the reference lower limit",
        400,
      );
    if (
      values.criticalHigh !== undefined &&
      values.referenceHigh !== undefined &&
      values.criticalHigh < values.referenceHigh
    )
      throw new AppError(
        "Critical high limit must not be below the reference upper limit",
        400,
      );
    const analyte = await LabAnalyte.findOneAndUpdate(
      { code },
      { $set: { name, unit, ...values, active: req.body?.active !== false } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
    res.status(200).json({ success: true, analyte });
  } catch (error: any) {
    res.status(error.statusCode || (error.code === 11000 ? 409 : 500)).json({
      success: false,
      message: error.message || "Unable to save analyte definition",
    });
  }
};

export const getLabCriticalContacts = async (_req: Request, res: Response) => {
  try {
    const contacts = await LabCriticalContact.find({ active: true })
      .sort({ priority: 1, name: 1 })
      .lean();
    res.json({ success: true, contacts });
  } catch {
    res
      .status(500)
      .json({ success: false, message: "Unable to load escalation contacts" });
  }
};

export const saveLabCriticalContact = async (req: Request, res: Response) => {
  try {
    const name = String(req.body?.name || "").trim();
    const role = String(req.body?.role || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const priority = Number(req.body?.priority || 1);
    if (
      !name ||
      name.length > 120 ||
      !role ||
      role.length > 100 ||
      !/^\+?[0-9][0-9\s()-]{5,30}$/.test(phone) ||
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 20
    )
      throw new AppError(
        "Enter a valid contact name, role, phone, and priority",
        400,
      );
    const contact = req.params.id
      ? await LabCriticalContact.findByIdAndUpdate(
          req.params.id,
          { name, role, phone, priority, active: req.body?.active !== false },
          { new: true, runValidators: true },
        )
      : await LabCriticalContact.create({ name, role, phone, priority });
    if (!contact) throw new AppError("Escalation contact not found", 404);
    res.json({ success: true, contact });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to save escalation contact",
    });
  }
};

export const getLabAnalytics = async (req: Request, res: Response) => {
  try {
    const allowed = [7, 30, 90];
    const requested = Number.parseInt(String(req.query.days || 30), 10);
    const days = allowed.includes(requested) ? requested : 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const orders = await DiagnosticOrder.find({
      testType: "PATHOLOGY",
      createdAt: { $gte: from },
    })
      .select(
        "testName status priority createdAt collectedAt reportedAt slaMin specimenHistory",
      )
      .lean();
    const completed = orders.filter(
      (order) => order.reportedAt && order.collectedAt,
    );
    const turnaround = completed.map((order) =>
      Math.max(
        0,
        (new Date(order.reportedAt!).getTime() -
          new Date(order.collectedAt!).getTime()) /
          60_000,
      ),
    );
    const averageTAT = turnaround.length
      ? Math.round(
          turnaround.reduce((sum, value) => sum + value, 0) / turnaround.length,
        )
      : null;
    const slaBreaches = completed.filter(
      (order) =>
        order.slaMin !== undefined &&
        (new Date(order.reportedAt!).getTime() -
          new Date(order.collectedAt!).getTime()) /
          60_000 >
          order.slaMin!,
    ).length;
    const byDay = new Map<string, number>();
    const byTest = new Map<string, number>();
    for (const order of orders) {
      const day = new Date(order.createdAt).toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) || 0) + 1);
      byTest.set(order.testName, (byTest.get(order.testName) || 0) + 1);
    }
    const p90 = turnaround.length
      ? Math.round(
          [...turnaround].sort((a, b) => a - b)[
            Math.ceil(turnaround.length * 0.9) - 1
          ]!,
        )
      : null;
    res.json({
      success: true,
      analytics: {
        days,
        totalOrders: orders.length,
        completedOrders: completed.length,
        pendingOrders: orders.filter((order) => order.status === "PENDING")
          .length,
        inProgressOrders: orders.filter(
          (order) => order.status === "IN_PROGRESS",
        ).length,
        averageTATMinutes: averageTAT,
        p90TATMinutes: p90,
        slaBreaches,
        dailyVolume: [...byDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count })),
        topTests: [...byTest.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([testName, count]) => ({ testName, count })),
      },
    });
  } catch {
    res
      .status(500)
      .json({ success: false, message: "Unable to calculate lab analytics" });
  }
};

export const getCriticalValues = async (_req: Request, res: Response) => {
  try {
    const criticals = await DiagnosticReport.find({
      isCritical: true,
      state: "pending sign",
    })
      .populate({
        path: "order",
        match: { testType: "PATHOLOGY" },
        select: "testName accessionNumber doctor specimenBarcode",
      })
      .populate("patient", "name phone")
      .populate("emergencyCase", "caseId patientName age sex")
      .populate("criticalCallback.contact", "name role phone priority")
      .sort({ createdAt: -1 })
      .lean();

    const now = Date.now();
    const current = criticals
      .filter((c) => c.order !== null)
      .map((report: any) => {
        const dueAt =
          report.criticalDueAt ||
          new Date(new Date(report.createdAt).getTime() + 15 * 60_000);
        const overdueMinutes = Math.max(
          0,
          Math.floor((now - new Date(dueAt).getTime()) / 60_000),
        );
        return {
          ...report,
          criticalDueAt: dueAt,
          overdueMinutes,
          overdue: overdueMinutes > 0,
          escalationLevel:
            report.criticalCallback?.escalationLevel ||
            Math.max(1, Math.floor(overdueMinutes / 15) + 1),
        };
      });
    res.status(200).json({
      success: true,
      criticalValues: current,
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
