import { Request, Response } from "express";
import {
  Appointment,
  Consultation,
  DiagnosticOrder,
  DiagnosticReport,
  Invoice,
  Vitals,
  PatientProfile,
} from "../models/index.js";
import { z } from "zod";
import { AppError } from "../middleware/error-handler.js";
import ImageKit from "imagekit";
import fs from "fs";

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_key",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_key",
  urlEndpoint:
    process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/your_endpoint",
});

// ==========================================
// 1. Get Patient Dashboard
// ==========================================
export const getPatientDashboard = async (req: Request, res: Response) => {
  try {
    const patientId = req.user?._id;

    if (!patientId) {
      throw new AppError("Patient not found", 404);
    }

    const view = String(req.query.view || "full");
    if (["overview", "appointments", "medications"].includes(view)) {
      const [appointments, consultations, vitals, profile] = await Promise.all([
        view === "medications"
          ? Promise.resolve([])
          : Appointment.find({
              patient: patientId,
              $nor: [
                { paymentMethod: "ONLINE", paymentStatus: "PENDING_ONLINE" },
              ],
            })
              .select(
                "doctor date timeSlot status type reason department slotEndTime arrivalTime queueNumber paidAmount amount",
              )
              .populate("doctor", "name role specialization")
              .sort({ date: -1, timeSlot: -1 })
              .lean(),
        Consultation.find({ patient: patientId })
          .select(
            view === "medications"
              ? "doctor medicines createdAt"
              : "doctor diagnosis chiefComplaint followUpDate appointment medicines createdAt",
          )
          .populate("doctor", "name role")
          .sort({ createdAt: -1 })
          .lean(),
        view === "overview"
          ? Vitals.find({ patient: patientId })
              .select(
                "bloodPressure heartRate temperature respiratoryRate spO2 createdAt",
              )
              .sort({ createdAt: -1 })
              .lean()
          : Promise.resolve([]),
        view === "overview"
          ? PatientProfile.findOne({ user: patientId }).lean()
          : Promise.resolve(null),
      ]);

      res.status(200).json({
        status: "success",
        data: {
          profile,
          appointments,
          consultations,
          diagnosticOrders: [],
          diagnosticReports: [],
          vitals,
          invoices: [],
        },
      });
      return;
    }

    // These reads are independent. Run them together to avoid stacking their
    // database round-trip times on every dashboard load.
    const [
      unpaidOnlineAppointmentIds,
      consultations,
      diagnosticOrders,
      diagnosticReports,
      vitals,
      profile,
    ] = await Promise.all([
      Appointment.find({
        patient: patientId,
        paymentMethod: "ONLINE",
        paymentStatus: "PENDING_ONLINE",
        status: "PENDING",
      }).distinct("_id"),
      Consultation.find({ patient: patientId })
        .populate("doctor", "name role")
        .sort({ createdAt: -1 })
        .lean(),
      DiagnosticOrder.find({ patient: patientId })
        .populate("doctor", "name")
        .sort({ createdAt: -1 })
        .lean(),
      DiagnosticReport.find({
        patient: patientId,
        state: "verified",
      })
        .populate("order", "testName testType")
        .sort({ createdAt: -1 })
        .lean(),
      Vitals.find({ patient: patientId }).sort({ createdAt: -1 }).lean(),
      PatientProfile.findOne({ user: patientId }).lean(),
    ]);

    // Both depend on the unpaid appointment IDs, but can run in parallel with
    // each other once that first read completes.
    const [appointments, invoices] = await Promise.all([
      Appointment.find({
        patient: patientId,
        $nor: [{ paymentMethod: "ONLINE", paymentStatus: "PENDING_ONLINE" }],
      })
        .populate("doctor", "name role specialization")
        .sort({ date: -1, timeSlot: -1 })
        .lean(),
      Invoice.find({
        patient: patientId,
        appointment: { $nin: unpaidOnlineAppointmentIds },
      })
        .populate("appointment", "date timeSlot paidAmount amount")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        profile,
        appointments,
        consultations,
        diagnosticOrders,
        diagnosticReports,
        vitals,
        invoices,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to fetch patient dashboard",
    });
  }
};

export const getPatientBilling = async (req: Request, res: Response) => {
  try {
    const patientId = req.user?._id;
    if (!patientId) throw new AppError("Patient not found", 404);

    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page || "1"), 10) || 1,
    );
    const pageSize = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(String(req.query.pageSize || "10"), 10) || 10,
      ),
    );
    const unpaidOnlineAppointmentIds = await Appointment.find({
      patient: patientId,
      paymentMethod: "ONLINE",
      paymentStatus: "PENDING_ONLINE",
      status: "PENDING",
    }).distinct("_id");
    const filter = {
      patient: patientId,
      appointment: { $nin: unpaidOnlineAppointmentIds },
    };

    const year = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
    }).format(new Date());
    const [invoices, total, summaryRows] = await Promise.all([
      Invoice.find(filter)
        .populate("appointment", "date timeSlot paidAmount amount")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Invoice.countDocuments(filter),
      Invoice.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "appointments",
            localField: "appointment",
            foreignField: "_id",
            pipeline: [{ $project: { paidAmount: 1 } }],
            as: "appointmentInfo",
          },
        },
        {
          $addFields: {
            insurance: { $ifNull: ["$insuranceCoverage", 0] },
            recordedPaid: {
              $max: [
                { $ifNull: ["$paidAmount", 0] },
                {
                  $ifNull: [
                    { $arrayElemAt: ["$appointmentInfo.paidAmount", 0] },
                    0,
                  ],
                },
              ],
            },
            hasPaymentHistory: {
              $gt: [{ $size: { $ifNull: ["$paymentHistory", []] } }, 0],
            },
          },
        },
        {
          $addFields: {
            paidEffective: {
              $cond: [
                { $eq: ["$status", "PAID"] },
                {
                  $max: [
                    "$recordedPaid",
                    { $subtract: ["$totalAmount", "$insurance"] },
                  ],
                },
                { $max: [0, "$recordedPaid"] },
              ],
            },
            paymentsThisYear: {
              $filter: {
                input: { $ifNull: ["$paymentHistory", []] },
                as: "payment",
                cond: {
                  $and: [
                    { $ne: ["$$payment.method", "INSURANCE"] },
                    {
                      $eq: [
                        {
                          $dateToString: {
                            date: "$$payment.paidAt",
                            format: "%Y",
                            timezone: "Asia/Kolkata",
                          },
                        },
                        year,
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            outstanding: {
              $sum: {
                $cond: [
                  { $ne: ["$status", "CANCELLED"] },
                  {
                    $max: [
                      0,
                      {
                        $subtract: [
                          { $subtract: ["$totalAmount", "$insurance"] },
                          "$paidEffective",
                        ],
                      },
                    ],
                  },
                  0,
                ],
              },
            },
            dueCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$status", "CANCELLED"] },
                      {
                        $gt: [
                          {
                            $subtract: [
                              { $subtract: ["$totalAmount", "$insurance"] },
                              "$paidEffective",
                            ],
                          },
                          0,
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            insured: { $sum: "$insurance" },
            paidThisYear: {
              $sum: {
                $cond: [
                  "$hasPaymentHistory",
                  { $sum: "$paymentsThisYear.amount" },
                  {
                    $cond: [
                      {
                        $eq: [
                          {
                            $dateToString: {
                              date: "$paidAt",
                              format: "%Y",
                              timezone: "Asia/Kolkata",
                            },
                          },
                          year,
                        ],
                      },
                      "$paidEffective",
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      ]),
    ]);

    const summary = summaryRows[0] || {
      outstanding: 0,
      dueCount: 0,
      insured: 0,
      paidThisYear: 0,
    };

    res.status(200).json({
      status: "success",
      data: { invoices, total, page, pageSize, summary },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to fetch patient billing",
    });
  }
};

export const getPatientRecords = async (req: Request, res: Response) => {
  try {
    const patientId = req.user?._id;
    if (!patientId) throw new AppError("Patient not found", 404);

    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page || "1"), 10) || 1,
    );
    const pageSize = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(String(req.query.pageSize || "10"), 10) || 10,
      ),
    );
    const offset = (page - 1) * pageSize;
    const query = String(req.query.q || "").trim();
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const search = escapedQuery ? new RegExp(escapedQuery, "i") : null;
    const orderFilter: Record<string, unknown> = {
      patient: patientId,
      status: { $ne: "REPORTED" },
    };
    const reportFilter: Record<string, unknown> = {
      patient: patientId,
      state: "verified",
    };
    if (search) {
      orderFilter.$or = [{ testName: search }, { testType: search }];
      reportFilter.$or = [
        { title: search },
        { fileName: search },
        { kind: search },
        { findings: search },
        { uploadedBy: search },
      ];
    }

    const fetchCount = offset + pageSize;
    const [orders, reports, orderCount, reportCount] = await Promise.all([
      DiagnosticOrder.find(orderFilter)
        .populate("doctor", "name")
        .sort({ createdAt: -1, _id: -1 })
        .limit(fetchCount)
        .lean(),
      DiagnosticReport.find(reportFilter)
        .populate("order", "testName testType")
        .sort({ createdAt: -1, _id: -1 })
        .limit(fetchCount)
        .lean(),
      DiagnosticOrder.countDocuments(orderFilter),
      DiagnosticReport.countDocuments(reportFilter),
    ]);

    const records = [
      ...orders.map((order) => ({
        id: String(order._id),
        name: order.testName,
        kind: order.testType,
        dept: (order.doctor as any)?.name
          ? `Dr. ${(order.doctor as any).name}`
          : "Doctor",
        date: order.createdAt,
        status: "pending",
        flagged: false,
        pages: 0,
        size: "",
        fileUrl: (order as any).fileUrl || null,
      })),
      ...reports.map((report) => ({
        id: String(report._id),
        name:
          (report.order as any)?.testName || report.title || "Uploaded Report",
        kind: (report.order as any)?.testType || "REPORT",
        dept: report.uploadedBy || "Lab / Radiology",
        date: report.createdAt,
        status: "ready",
        flagged: false,
        pages: report.pages || 1,
        size: report.fileSize || "PDF",
        fileUrl: report.fileUrl || null,
        reportId: String(report._id),
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(offset, offset + pageSize);

    res.status(200).json({
      status: "success",
      data: { records, total: orderCount + reportCount, page, pageSize },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to fetch patient records",
    });
  }
};

const profileSchema = z.object({
  dob: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"])
    .optional(),
  emergencyPhone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medicalHistory: z.string().optional(),
  address: z.string().optional(),
  height: z.number().optional(),
  heightUnit: z.enum(["cm", "ft"]).optional(),
  weight: z.number().optional(),
});

export const updatePatientProfile = async (req: Request, res: Response) => {
  try {
    const patientId = req.user?.id;
    const parsed = profileSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile data",
        errors: parsed.error.format(),
      });
    }

    let profile = await PatientProfile.findOne({ user: patientId });
    if (!profile) {
      profile = new PatientProfile({ user: patientId });
    }

    Object.assign(profile, parsed.data);
    profile.isComplete = true; // Mark as complete upon manual update
    await profile.save();

    res.status(200).json({
      success: true,
      message: "Patient profile updated successfully",
      profile,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update patient profile",
    });
  }
};

// ==========================================
// 4. Upload Document
// ==========================================
export const uploadPatientDocument = async (req: Request, res: Response) => {
  try {
    const patientId = req.user?._id;
    if (!patientId) throw new AppError("Unauthorized", 401);

    if (!req.file) {
      throw new AppError("No file uploaded", 400);
    }

    const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2) + " MB";

    let fileUrl = "";
    let localFileName: string | undefined;
    if (req.file) {
      try {
        const fileBuffer = await fs.promises.readFile(req.file.path);
        const uploadResponse = await imagekit.upload({
          file: fileBuffer,
          fileName: `patient_report_${patientId}_${Date.now()}`,
          folder: "/hms/reports",
        });
        fileUrl = uploadResponse.url;
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.warn(
          "ImageKit upload failed, falling back to local storage:",
          err,
        );
        localFileName = req.file.filename;
        fileUrl = `/api/v1/reports/LOCAL_FILE_ID/file`;
      }
    }

    const { title } = req.body;

    const report = new DiagnosticReport({
      patient: patientId,
      title: title || req.file.originalname,
      uploadedBy: req.user?.name || "Patient",
      fileUrl,
      ...(localFileName ? { localFileName } : {}),
      fileName: req.file.originalname,
      fileSize: fileSizeMB,
      kind: "Prior report",
      state: "verified",
    });

    await report.save();
    if (localFileName) {
      report.fileUrl = `/api/v1/reports/${report._id}/file`;
      await report.save();
    }

    res.status(201).json({
      status: "success",
      message: "Document uploaded successfully",
      data: report,
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw new AppError(error.message || "Failed to upload document", 500);
  }
};
