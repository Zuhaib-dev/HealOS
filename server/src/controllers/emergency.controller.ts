// ============================================
// HealOS Server — Emergency Controller
// ============================================
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import {
  EmergencyCase,
  EmergencyObservation,
  ResusBay,
  InboundAmbulance,
  MajorIncident,
  User,
  UserRole,
  Consultation,
  ConsultationStatus,
  PharmacySale,
  EmergencyMedicationAdministration,
  DiagnosticOrder,
  DiagnosticOrderPriority,
  DiagnosticTestType,
  DiagnosticReport,
  EmergencyAdmission,
  Ward,
} from "../models";
import { logAudit } from "../utils/audit.js";
import { getIO } from "../socket.js";

// ============================================
// Realtime Broadcast Helper
// ============================================
const broadcastEmergencyEvent = (event: string, payload: any) => {
  try {
    const io = getIO();
    io.emit(event, payload);
    // Also target role-specific rooms
    io.to("emergency_doctor").emit(event, payload);
    io.to("doctor").emit(event, payload);
    io.to("nurse").emit(event, payload);
    io.to("admin").emit(event, payload);
  } catch {
    // Socket not yet initialized or test environment
  }
};

const emergencyDispositions = [
  "awaiting triage",
  "in bay",
  "awaiting bed",
  "for discharge",
  "admitted",
  "transferred",
  "deceased",
] as const;

const formatEmergencyCase = (record: any) => {
  const arrivedDate = new Date(record.arrivedAt);
  const waitMin = Math.max(
    0,
    Math.floor((Date.now() - arrivedDate.getTime()) / 60000),
  );
  return {
    _id: record._id.toString(),
    id: record.caseId,
    patient: record.patientName,
    age: record.age,
    sex: record.sex,
    complaint: record.presentingComplaint,
    esi: record.esi,
    arrived: `${String(arrivedDate.getHours()).padStart(2, "0")}:${String(arrivedDate.getMinutes()).padStart(2, "0")}`,
    arrivedAt: arrivedDate.toISOString(),
    waitMin,
    area: record.area,
    obs: record.observations,
    disposition: record.disposition,
    assignedDoctorName: record.assignedDoctorName,
    assignedDoctorId: record.assignedDoctor?.toString(),
    clinicianAssignedAt: record.clinicianAssignedAt?.toISOString(),
    encounterStatus: record.encounterStatus,
    diagnosisSummary: record.diagnosisSummary,
    dischargedAt: record.dischargedAt?.toISOString(),
    triageNotes: record.triageNotes,
  };
};

const allocateEmergencyCaseId = async () => {
  const counter = await EmergencyCase.db
    .collection<{ _id: string; sequence: number }>("emergency_counters")
    .findOneAndUpdate(
      { _id: "case-id" },
      { $inc: { sequence: 1 } },
      { upsert: true, returnDocument: "after" },
    );
  const sequence = counter?.sequence;
  if (typeof sequence !== "number") {
    throw new Error("Unable to allocate emergency case identifier");
  }
  const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `ED-${day}-${String(sequence).padStart(5, "0")}`;
};

// Remove only the exact demo fixtures previously inserted by this controller.
// Matching both identifiers and fixture text avoids deleting real operations
// records that happen to share a short unit or bay label.
let legacyDemoCleanup: Promise<void> | undefined;
const removeLegacyEmergencyDemoData = async () => {
  legacyDemoCleanup ??= Promise.all([
    EmergencyCase.deleteMany({
      $or: [
        {
          caseId: "ED-4412",
          patientName: "Unknown male",
          presentingComplaint: "Cardiac arrest · ROSC en route",
        },
        {
          caseId: "ED-4411",
          patientName: "Sana Qureshi",
          presentingComplaint: "Severe asthma, silent chest",
        },
        {
          caseId: "ED-4409",
          patientName: "Tom Whelan",
          presentingComplaint: "Central chest pain, ST changes",
        },
        {
          caseId: "ED-4408",
          patientName: "Meera Joshi",
          presentingComplaint: "RIF pain, vomiting",
        },
        {
          caseId: "ED-4405",
          patientName: "Kofi Mensah",
          presentingComplaint: "Ankle injury, weight-bearing",
        },
        {
          caseId: "ED-4402",
          patientName: "Elsie Barnes",
          presentingComplaint: "Mechanical fall, no LOC",
        },
      ],
    }),
    ResusBay.deleteMany({
      $or: [
        {
          bayId: "Resus 1",
          patientSummary: "Unknown male · post-arrest",
          team: "Dr. Varma + 3",
        },
        {
          bayId: "Resus 2",
          patientSummary: "Sana Qureshi · asthma",
          team: "Dr. Bose + 2",
        },
        { bayId: "Resus 3", patientSummary: "—", airway: "checked 12:00" },
        { bayId: "Resus 4", patientSummary: "—", team: "Housekeeping" },
      ],
    }),
    InboundAmbulance.deleteMany({
      $or: [
        {
          unit: "AMB-21",
          presentingComplaint: "STEMI, pre-alert",
          crew: "Paramedic Shah",
        },
        {
          unit: "AMB-07",
          presentingComplaint: "RTC, ?pelvic fracture",
          crew: "Paramedic Cole",
        },
        {
          unit: "AMB-14",
          presentingComplaint: "Elderly fall, hip pain",
          crew: "Tech Grewal",
        },
      ],
    }),
    MajorIncident.deleteMany({
      isArmed: false,
      surgeBeds: 42,
      theatresArmed: 3,
      staffRecalled: 68,
      "steps.0.text": "Declare major incident to switchboard (dial 2222)",
    }),
  ])
    .then(() => undefined)
    .catch((error) => {
      legacyDemoCleanup = undefined;
      throw error;
    });
  return legacyDemoCleanup;
};

// ============================================
// 1. Triage Board Operations
// ============================================

const getEmergencyStatsData = async () => {
  const activeFilter = {
    isArchived: false,
    disposition: { $ne: "admitted" },
  };
  // Match the previous whole-minute calculation: a case breaches once its
  // floored wait is greater than 240 minutes (at 241 elapsed minutes).
  const breachCutoff = new Date(Date.now() - 241 * 60 * 1000);
  const [totalInDept, awaitingTriage, fourHourBreaches] = await Promise.all([
    EmergencyCase.countDocuments(activeFilter),
    EmergencyCase.countDocuments({
      ...activeFilter,
      disposition: "awaiting triage",
    }),
    EmergencyCase.countDocuments({
      ...activeFilter,
      arrivedAt: { $lt: breachCutoff },
    }),
  ]);
  return {
    totalInDept,
    awaitingTriage,
    medianTimeToClinician: "—",
    fourHourBreaches,
  };
};

export const getEmergencyStats = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    await removeLegacyEmergencyDemoData();
    const stats = await getEmergencyStatsData();

    res.status(StatusCodes.OK).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error in getEmergencyStats:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch emergency stats",
    });
  }
};

export const getTriageCases = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await removeLegacyEmergencyDemoData();
    const { filter } = req.query;
    let query: any = { isArchived: false };

    if (filter === "esi12") {
      query.esi = { $in: [1, 2] };
    } else if (filter === "waiting") {
      query.disposition = "awaiting triage";
    }

    const [cases, stats] = await Promise.all([
      EmergencyCase.find(query)
        .select(
          "caseId patientName age sex presentingComplaint esi arrivedAt area observations disposition assignedDoctor assignedDoctorName clinicianAssignedAt encounterStatus diagnosisSummary dischargedAt triageNotes",
        )
        .sort({ esi: 1, arrivedAt: 1 })
        .lean(),
      getEmergencyStatsData(),
    ]);

    const formattedCases = cases.map(formatEmergencyCase);

    res.status(StatusCodes.OK).json({
      success: true,
      cases: formattedCases,
      count: formattedCases.length,
      stats,
    });
  } catch (error) {
    console.error("Error in getTriageCases:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch triage cases",
    });
  }
};

export const getEmergencyClinicians = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const clinicians = await User.find({
      role: { $in: [UserRole.DOCTOR, UserRole.EMERGENCY_DOCTOR] },
    })
      .select("name role")
      .sort({ name: 1 })
      .lean();
    res.status(StatusCodes.OK).json({ success: true, clinicians });
  } catch (error) {
    console.error("Error in getEmergencyClinicians:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to load emergency clinicians.",
    });
  }
};

export const getMyEmergencyCases = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const cases = await EmergencyCase.find({
      assignedDoctor: req.user?._id,
      isArchived: false,
    })
      .sort({ esi: 1, arrivedAt: 1 })
      .lean();
    res.status(StatusCodes.OK).json({
      success: true,
      cases: cases.map(formatEmergencyCase),
      count: cases.length,
    });
  } catch (error) {
    console.error("Error in getMyEmergencyCases:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to load your emergency worklist.",
    });
  }
};

export const assignEmergencyCase = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const { doctorId } = req.body ?? {};
    if (
      !mongoose.isValidObjectId(id) ||
      (doctorId !== null && !mongoose.isValidObjectId(doctorId))
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Select a valid emergency clinician.",
      });
      return;
    }
    const emergencyCase = await EmergencyCase.findById(id);
    if (!emergencyCase || emergencyCase.isArchived) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Active emergency case not found." });
      return;
    }
    if (doctorId === null) {
      emergencyCase.assignedDoctor = undefined;
      emergencyCase.assignedDoctorName = undefined;
      emergencyCase.clinicianAssignedAt = undefined;
    } else {
      const clinician = await User.findOne({
        _id: doctorId,
        role: { $in: [UserRole.DOCTOR, UserRole.EMERGENCY_DOCTOR] },
      }).select("name");
      if (!clinician) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message:
            "The selected user is not an active doctor or emergency doctor.",
        });
        return;
      }
      emergencyCase.assignedDoctor = clinician._id;
      emergencyCase.assignedDoctorName = clinician.name;
      emergencyCase.clinicianAssignedAt = new Date();
    }
    await emergencyCase.save();
    const formattedCase = formatEmergencyCase(emergencyCase);
    broadcastEmergencyEvent("emergency:triage_updated", {
      action: "assigned",
      case: formattedCase,
    });
    await logAudit(
      req.user?.name || "emergency_staff",
      doctorId === null
        ? `Unassigned clinician from ED case ${emergencyCase.caseId}`
        : `Assigned ${emergencyCase.assignedDoctorName} to ED case ${emergencyCase.caseId}`,
      emergencyCase.caseId,
      "info",
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Emergency case assignment updated.",
      case: formattedCase,
    });
  } catch (error) {
    console.error("Error in assignEmergencyCase:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to assign emergency case." });
  }
};

export const getEmergencyCaseById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    if (!mongoose.isValidObjectId(id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Invalid emergency case ID." });
      return;
    }
    const emergencyCase = await EmergencyCase.findOne({
      _id: id,
      isArchived: false,
    });
    if (!emergencyCase) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Active emergency case not found." });
      return;
    }
    res
      .status(StatusCodes.OK)
      .json({ success: true, case: formatEmergencyCase(emergencyCase) });
  } catch (error) {
    console.error("Error in getEmergencyCaseById:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to load emergency case." });
  }
};

export const getEmergencyWards = async (_req: Request, res: Response) => {
  try {
    const wards = await Ward.find()
      .select("name code department capacity currentOccupancy")
      .sort({ name: 1 })
      .lean();
    res.status(StatusCodes.OK).json({
      success: true,
      wards: wards.map((ward) => ({
        ...ward,
        available: Math.max(0, ward.capacity - ward.currentOccupancy),
      })),
    });
  } catch (error) {
    console.error("Error in getEmergencyWards:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to load ward capacity." });
  }
};

// Historical ED register: cases remain discoverable after discharge/archive.
export const getEmergencyRecords = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
    const limit = Math.max(10, Math.min(100, Number(req.query.limit) || 25));
    const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const status =
      typeof req.query.status === "string" ? req.query.status : "all";
    const query: Record<string, any> = {};
    if (status === "active") query.isArchived = false;
    if (status === "closed")
      query.$or = [
        { isArchived: true },
        { disposition: { $in: ["admitted", "transferred", "deceased"] } },
      ];
    if (search) {
      const searchFilter = {
        $or: [
          {
            caseId: {
              $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              $options: "i",
            },
          },
          {
            patientName: {
              $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              $options: "i",
            },
          },
          {
            presentingComplaint: {
              $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              $options: "i",
            },
          },
        ],
      };
      if (query.$or) query.$and = [{ $or: query.$or }, searchFilter];
      else Object.assign(query, searchFilter);
    }
    const [cases, total] = await Promise.all([
      EmergencyCase.find(query)
        .sort({ arrivedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EmergencyCase.countDocuments(query),
    ]);
    res.status(StatusCodes.OK).json({
      success: true,
      cases: cases.map(formatEmergencyCase),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error in getEmergencyRecords:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to load ED records." });
  }
};

// Aggregate work from clinical records so staff see only real outstanding work.
export const getEmergencyPendingWork = async (_req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const cases = await EmergencyCase.find({ arrivedAt: { $gte: since } })
      .select(
        "caseId patientName esi arrivedAt disposition assignedDoctor assignedDoctorName clinicianAssignedAt encounterStatus updatedAt",
      )
      .sort({ esi: 1, arrivedAt: 1 })
      .limit(1000)
      .lean();
    if (cases.length === 0) {
      return void res.status(StatusCodes.OK).json({
        success: true,
        tasks: [],
        counts: {},
        total: 0,
        lookbackDays: 180,
      });
    }
    const caseIds = cases.map((emergencyCase) => emergencyCase._id);
    const [orders, consultations, sales, admissions] = await Promise.all([
      DiagnosticOrder.find({
        emergencyCase: { $in: caseIds },
        status: { $in: ["PENDING", "IN_PROGRESS", "REPORTED"] },
        createdAt: { $gte: since },
      })
        .select("emergencyCase testName testType priority status createdAt")
        .lean(),
      Consultation.find({
        emergencyCase: { $in: caseIds },
        status: "COMPLETED",
        createdAt: { $gte: since },
      })
        .select("emergencyCase medicines createdAt")
        .lean(),
      PharmacySale.find({
        emergencyCase: { $in: caseIds },
        status: { $in: ["AWAITING_PAYMENT", "DISPENSING"] },
        createdAt: { $gte: since },
      })
        .select("emergencyCase consultation status createdAt")
        .lean(),
      EmergencyAdmission.find({
        emergencyCase: { $in: caseIds },
        status: "ACTIVE",
      })
        .select("emergencyCase")
        .lean(),
    ]);
    const byId = new Map(cases.map((c) => [c._id.toString(), c]));
    const admissionCaseIds = new Set(
      admissions.map((admission) => admission.emergencyCase.toString()),
    );
    const tasks: any[] = [];
    const add = (
      c: any,
      category: string,
      title: string,
      href: string,
      createdAt?: Date,
      detail?: string,
    ) => {
      if (!c) return;
      tasks.push({
        caseId: c.caseId,
        patient: c.patientName,
        esi: c.esi,
        category,
        title,
        detail,
        href: `/emergency/records/${c._id}`,
        actionHref: href || undefined,
        createdAt: createdAt?.toISOString() || c.arrivedAt.toISOString(),
      });
    };
    for (const c of cases) {
      if (c.disposition === "awaiting triage")
        add(c, "Triage", "Triage assessment required", "", c.arrivedAt);
      if (
        !c.assignedDoctor &&
        !["admitted", "transferred", "deceased"].includes(c.disposition)
      )
        add(c, "Assignment", "Assign an ED clinician", "", c.arrivedAt);
      if (
        c.assignedDoctor &&
        c.encounterStatus !== "COMPLETED" &&
        !["admitted", "transferred", "deceased"].includes(c.disposition)
      )
        add(
          c,
          "Clinical review",
          "Complete the clinician encounter",
          "",
          c.clinicianAssignedAt || c.arrivedAt,
        );
      if (
        c.disposition === "awaiting bed" &&
        !admissionCaseIds.has(c._id.toString())
      )
        add(
          c,
          "Ward handoff",
          "Complete ward admission handoff",
          `/emergency/admissions/${c._id}`,
          c.updatedAt,
        );
    }
    const reports = orders.length
      ? await DiagnosticReport.find({
          order: { $in: orders.map((o) => o._id) },
        })
          .select("order state")
          .lean()
      : [];
    const unverifiedReportByOrder = new Map<string, boolean>();
    for (const report of reports) {
      const orderId = report.order.toString();
      unverifiedReportByOrder.set(
        orderId,
        (unverifiedReportByOrder.get(orderId) ?? false) ||
          report.state !== "verified",
      );
    }
    for (const order of orders) {
      const c = byId.get(order.emergencyCase?.toString() || "");
      if (order.status === "PENDING" || order.status === "IN_PROGRESS")
        add(
          c,
          "Diagnostics",
          `${order.testName} · ${order.status === "PENDING" ? "awaiting processing" : "in progress"}`,
          "",
          order.createdAt,
          order.priority,
        );
      if (
        order.status === "REPORTED" &&
        unverifiedReportByOrder.get(order._id.toString())
      )
        add(
          c,
          "Result review",
          `Review ${order.testName} result`,
          "",
          order.createdAt,
        );
    }
    const saleConsultations = new Set(
      sales.map((s) => s.consultation.toString()),
    );
    for (const sale of sales) {
      const c = byId.get(sale.emergencyCase?.toString() || "");
      add(
        c,
        "Pharmacy",
        sale.status === "AWAITING_PAYMENT"
          ? "Prescription awaiting payment"
          : "Prescription dispensing in progress",
        "",
        sale.createdAt,
      );
    }
    for (const consultation of consultations) {
      const hasMedicines = consultation.medicines?.some(
        (m: any) => !m.isDispensed,
      );
      if (hasMedicines && !saleConsultations.has(consultation._id.toString()))
        add(
          byId.get(consultation.emergencyCase?.toString() || ""),
          "Pharmacy",
          "Prescription awaiting pharmacy processing",
          "",
          consultation.createdAt,
        );
    }
    tasks.sort(
      (a, b) =>
        (a.esi ?? 5) - (b.esi ?? 5) ||
        Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
    const counts = tasks.reduce((acc: Record<string, number>, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {});
    res.status(StatusCodes.OK).json({
      success: true,
      tasks,
      counts,
      total: tasks.length,
      lookbackDays: 180,
    });
  } catch (error) {
    console.error("Error in getEmergencyPendingWork:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to load pending ED work." });
  }
};

export const getEmergencyCaseRecord = async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    if (!mongoose.isValidObjectId(id))
      return void res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Invalid emergency case ID." });
    const record = await EmergencyCase.findById(id).lean();
    if (!record)
      return void res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "ED record not found." });
    const [encounter, observations, orders, administrations, admission, sales] =
      await Promise.all([
        Consultation.findOne({ emergencyCase: id })
          .populate("doctor", "name")
          .lean(),
        EmergencyObservation.find({ emergencyCase: id })
          .sort({ recordedAt: -1 })
          .limit(100)
          .populate("recordedBy", "name")
          .lean(),
        DiagnosticOrder.find({ emergencyCase: id })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
        EmergencyMedicationAdministration.find({ emergencyCase: id })
          .sort({ recordedAt: -1 })
          .limit(100)
          .populate("recordedBy", "name")
          .lean(),
        EmergencyAdmission.findOne({ emergencyCase: id })
          .populate("ward", "name code")
          .populate("admittedBy", "name")
          .lean(),
        PharmacySale.find({ emergencyCase: id })
          .select("status totalAmount createdAt dispensedAt items")
          .sort({ createdAt: -1 })
          .lean(),
      ]);
    const reports = orders.length
      ? await DiagnosticReport.find({
          order: { $in: orders.map((o) => o._id) },
        })
          .select(
            "order title state findings comments isCritical structuredResults fileUrl createdAt",
          )
          .lean()
      : [];
    const reportByOrder = new Map<string, (typeof reports)[number]>();
    for (const report of reports) {
      const orderId = report.order.toString();
      if (!reportByOrder.has(orderId)) reportByOrder.set(orderId, report);
    }
    const diagnosticHistory = orders.map((order) => {
      const report: any = reportByOrder.get(order._id.toString());
      const safeReport =
        report?.state === "verified"
          ? report
          : report
            ? {
                state: report.state,
                isCritical: report.isCritical,
                createdAt: report.createdAt,
              }
            : null;
      return { ...order, report: safeReport };
    });
    res.status(StatusCodes.OK).json({
      success: true,
      case: formatEmergencyCase(record),
      encounter,
      observations,
      diagnostics: diagnosticHistory,
      administrations,
      admission,
      pharmacy: sales,
    });
  } catch (error) {
    console.error("Error in getEmergencyCaseRecord:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to load ED patient record." });
  }
};

export const getEmergencyAdmission = async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Invalid emergency case ID." });
    }
    const emergencyCase = await EmergencyCase.findById(id).lean();
    if (!emergencyCase)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Emergency case not found." });
    const admission = await EmergencyAdmission.findOne({ emergencyCase: id })
      .populate("ward", "name code department capacity currentOccupancy")
      .populate("admittedBy", "name")
      .lean();
    const wards = await Ward.find()
      .select("name code department capacity currentOccupancy")
      .sort({ name: 1 })
      .lean();
    res.status(StatusCodes.OK).json({
      success: true,
      case: formatEmergencyCase(emergencyCase),
      admission,
      wards: wards.map((ward) => ({
        ...ward,
        available: Math.max(0, ward.capacity - ward.currentOccupancy),
      })),
    });
  } catch (error) {
    console.error("Error in getEmergencyAdmission:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to load admission handoff." });
  }
};

export const createEmergencyAdmission = async (req: Request, res: Response) => {
  let occupiedWardId: mongoose.Types.ObjectId | undefined;
  let createdAdmissionId: mongoose.Types.ObjectId | undefined;
  try {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const { wardId, reason } = req.body || {};
    const normalizedReason = typeof reason === "string" ? reason.trim() : "";
    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(wardId) ||
      normalizedReason.length < 3 ||
      normalizedReason.length > 1000
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Choose a ward and enter an admission reason.",
      });
    }
    const emergencyCase = await EmergencyCase.findOne({
      _id: id,
      isArchived: false,
    });
    if (!emergencyCase)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Active emergency case not found." });
    if (
      req.user?.role !== UserRole.ADMIN &&
      emergencyCase.assignedDoctor?.toString() !== req.user?._id?.toString()
    ) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Only the assigned clinician can initiate this admission.",
      });
    }
    const consultation = await Consultation.findOne({
      emergencyCase: emergencyCase._id,
      status: ConsultationStatus.COMPLETED,
    });
    if (!consultation || !consultation.diagnosis?.trim())
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message:
          "Sign the ED clinician encounter with a diagnosis before admission.",
      });
    const existing = await EmergencyAdmission.findOne({
      emergencyCase: emergencyCase._id,
    });
    if (existing)
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: `An admission record already exists (${existing.status.toLowerCase()}).`,
      });
    const ward = await Ward.findOneAndUpdate(
      {
        _id: wardId,
        $expr: {
          $lt: [{ $ifNull: ["$currentOccupancy", 0] }, "$capacity"],
        },
      },
      { $inc: { currentOccupancy: 1 } },
      { new: true },
    );
    if (!ward)
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message:
          "That ward is full or unavailable. Refresh and choose another ward.",
      });
    occupiedWardId = ward._id;
    const admission = await EmergencyAdmission.create({
      emergencyCase: emergencyCase._id,
      ward: ward._id,
      admittedBy: req.user?._id,
      patientName: emergencyCase.patientName,
      diagnosis: consultation.diagnosis,
      reason: normalizedReason,
    });
    createdAdmissionId = admission._id;
    emergencyCase.disposition = "admitted";
    emergencyCase.area = ward.name;
    await emergencyCase.save();
    createdAdmissionId = undefined;
    occupiedWardId = undefined;
    const result = await EmergencyAdmission.findById(admission._id)
      .populate("ward", "name code department capacity currentOccupancy")
      .populate("admittedBy", "name")
      .lean();
    broadcastEmergencyEvent("emergency:triage_updated", {
      action: "admitted",
      case: formatEmergencyCase(emergencyCase),
      admission: result,
    });
    getIO()?.emit("admin:data_changed", { types: ["wards", "emergency"] });
    await logAudit(
      req.user?.name || "emergency_staff",
      `Admitted ED case ${emergencyCase.caseId} to ${ward.name}`,
      emergencyCase.caseId,
      "info",
    );
    return res.status(StatusCodes.CREATED).json({
      success: true,
      admission: result,
      case: formatEmergencyCase(emergencyCase),
    });
  } catch (error: any) {
    if (createdAdmissionId) {
      await EmergencyAdmission.deleteOne({ _id: createdAdmissionId }).catch(
        () => undefined,
      );
    }
    if (occupiedWardId)
      await Ward.updateOne(
        { _id: occupiedWardId, currentOccupancy: { $gt: 0 } },
        { $inc: { currentOccupancy: -1 } },
      ).catch(() => undefined);
    if (error?.code === 11000)
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "This ED visit already has an admission record.",
      });
    console.error("Error in createEmergencyAdmission:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to complete ward admission." });
  }
};

export const closeEmergencyAdmission = async (req: Request, res: Response) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    if (!mongoose.isValidObjectId(id) || note.length < 3 || note.length > 1000)
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Enter a discharge handoff note of at least 3 characters.",
      });
    const admission = await EmergencyAdmission.findOneAndUpdate(
      { emergencyCase: id, status: "ACTIVE" },
      {
        $set: {
          status: "DISCHARGED",
          dischargedAt: new Date(),
          ...(note ? { dischargeNote: note } : {}),
        },
      },
      { new: true },
    );
    if (!admission)
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "No active ward admission exists for this case.",
      });
    const released = await Ward.updateOne(
      { _id: admission.ward, currentOccupancy: { $gt: 0 } },
      { $inc: { currentOccupancy: -1 } },
    );
    if (released.modifiedCount !== 1) {
      await EmergencyAdmission.updateOne(
        { _id: admission._id, status: "DISCHARGED" },
        {
          $set: { status: "ACTIVE" },
          $unset: { dischargedAt: 1, dischargeNote: 1 },
        },
      );
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message:
          "Ward occupancy needs reconciliation before this discharge can be recorded.",
      });
    }
    const emergencyCase = await EmergencyCase.findByIdAndUpdate(
      id,
      {
        $set: {
          disposition: "for discharge",
          isArchived: true,
          dischargedAt: new Date(),
          ...(req.user?._id ? { dischargedBy: req.user._id } : {}),
        },
      },
      { new: true },
    );
    broadcastEmergencyEvent("emergency:triage_updated", {
      action: "inpatient_discharge",
      case: emergencyCase && formatEmergencyCase(emergencyCase),
      admission,
    });
    getIO()?.emit("admin:data_changed", { types: ["wards", "emergency"] });
    await logAudit(
      req.user?.name || "emergency_staff",
      `Closed ward admission for ED case ${admission.patientName}`,
      String(id),
      "info",
    );
    return res.status(StatusCodes.OK).json({
      success: true,
      admission,
      case: emergencyCase && formatEmergencyCase(emergencyCase),
    });
  } catch (error) {
    console.error("Error in closeEmergencyAdmission:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to close ward admission." });
  }
};

const getAssignedEmergencyCase = async (
  id: string,
  req: Request,
  res: Response,
) => {
  if (!mongoose.isValidObjectId(id)) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: "Invalid emergency case ID." });
    return null;
  }
  const emergencyCase = await EmergencyCase.findOne({
    _id: id,
    isArchived: false,
  });
  if (!emergencyCase) {
    res
      .status(StatusCodes.NOT_FOUND)
      .json({ success: false, message: "Active emergency case not found." });
    return null;
  }
  if (emergencyCase.assignedDoctor?.toString() !== req.user?._id?.toString()) {
    res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      message: "This encounter is available only to its assigned clinician.",
    });
    return null;
  }
  return emergencyCase;
};

export const getEmergencyEncounter = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const emergencyCase = await getAssignedEmergencyCase(id, req, res);
    if (!emergencyCase) return;
    const consultation = await Consultation.findOne({
      emergencyCase: emergencyCase._id,
    }).lean();
    const diagnosticOrders = consultation
      ? await DiagnosticOrder.find({ consultation: consultation._id })
          .select(
            "testType testName priority status accessionNumber createdAt reportedAt",
          )
          .sort({ createdAt: 1 })
          .lean()
      : [];
    const diagnostics = await Promise.all(
      diagnosticOrders.map(async (order) => {
        const report = await DiagnosticReport.findOne({ order: order._id })
          .select(
            "title comments findings fileUrl state structuredResults isCritical createdAt",
          )
          .sort({ createdAt: -1 })
          .lean();
        return {
          ...order,
          report:
            report?.state === "verified"
              ? report
              : report
                ? { state: report.state, isCritical: report.isCritical }
                : null,
        };
      }),
    );
    res.status(StatusCodes.OK).json({
      success: true,
      case: formatEmergencyCase(emergencyCase),
      encounter: consultation,
      diagnostics,
    });
  } catch (error) {
    console.error("Error in getEmergencyEncounter:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to load ED encounter." });
  }
};

export const saveEmergencyEncounter = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const emergencyCase = await getAssignedEmergencyCase(id, req, res);
    if (!emergencyCase) return;
    const body =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body
        : {};
    const assessment =
      typeof body.assessment === "string" ? body.assessment.trim() : "";
    const diagnosis =
      typeof body.diagnosis === "string" ? body.diagnosis.trim() : "";
    const advice = typeof body.advice === "string" ? body.advice.trim() : "";
    const status = body.status;
    const medicines = body.medicines;
    const diagnosticOrders = body.diagnosticOrders;
    if (
      assessment.length > 4000 ||
      diagnosis.length > 2000 ||
      advice.length > 4000 ||
      ![ConsultationStatus.DRAFT, ConsultationStatus.COMPLETED].includes(
        status,
      ) ||
      !Array.isArray(medicines) ||
      medicines.length > 50 ||
      !Array.isArray(diagnosticOrders) ||
      diagnosticOrders.length > 30
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Check the encounter fields, medicine list, and diagnostic orders.",
      });
      return;
    }
    if (status === ConsultationStatus.COMPLETED && diagnosis.length < 2) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Enter a diagnosis before signing the encounter.",
      });
      return;
    }
    const normalizedMedicines: {
      name: string;
      dosage: string;
      route: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }[] = [];
    const normalizedDiagnosticOrders: {
      testType: DiagnosticTestType;
      testName: string;
      priority: DiagnosticOrderPriority;
      clinicalNotes?: string;
    }[] = [];
    for (const medicine of medicines) {
      if (!medicine || typeof medicine !== "object") {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: "Invalid medicine order." });
        return;
      }
      const name =
        typeof medicine.name === "string" ? medicine.name.trim() : "";
      const dosage =
        typeof medicine.dosage === "string" ? medicine.dosage.trim() : "";
      const route =
        typeof medicine.route === "string" ? medicine.route.trim() : "";
      const frequency =
        typeof medicine.frequency === "string" ? medicine.frequency.trim() : "";
      const duration =
        typeof medicine.duration === "string" ? medicine.duration.trim() : "";
      const instructions =
        typeof medicine.instructions === "string"
          ? medicine.instructions.trim()
          : "";
      if (
        !name &&
        !dosage &&
        !route &&
        !frequency &&
        !duration &&
        !instructions
      )
        continue;
      if (
        !name ||
        !dosage ||
        !route ||
        !frequency ||
        !duration ||
        name.length > 160 ||
        dosage.length > 120 ||
        route.length > 80 ||
        frequency.length > 120 ||
        duration.length > 120 ||
        instructions.length > 500
      ) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message:
            "Each medicine order needs a name, dose, route, frequency, and duration.",
        });
        return;
      }
      normalizedMedicines.push({
        name,
        dosage,
        route,
        frequency,
        duration,
        ...(instructions ? { instructions } : {}),
      });
    }
    for (const order of diagnosticOrders) {
      if (!order || typeof order !== "object") {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: "Invalid diagnostic order." });
        return;
      }
      const testType = order.testType;
      const testName =
        typeof order.testName === "string" ? order.testName.trim() : "";
      const priority = order.priority;
      const clinicalNotes =
        typeof order.clinicalNotes === "string"
          ? order.clinicalNotes.trim()
          : "";
      if (!testName && !clinicalNotes) continue;
      if (
        ![DiagnosticTestType.PATHOLOGY, DiagnosticTestType.RADIOLOGY].includes(
          testType,
        ) ||
        !testName ||
        testName.length > 200 ||
        clinicalNotes.length > 1000 ||
        !Object.values(DiagnosticOrderPriority).includes(priority)
      ) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message:
            "Each diagnostic order needs a valid type, test name, and priority.",
        });
        return;
      }
      normalizedDiagnosticOrders.push({
        testType,
        testName,
        priority,
        ...(clinicalNotes ? { clinicalNotes } : {}),
      });
    }
    let consultation = await Consultation.findOne({
      emergencyCase: emergencyCase._id,
    });
    if (consultation) {
      if (consultation.status === ConsultationStatus.COMPLETED) {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "A signed ED encounter cannot be changed.",
        });
        return;
      }
      const sale = await PharmacySale.findOne({
        consultation: consultation._id,
      });
      if (
        sale ||
        consultation.medicines.some((medicine) => medicine.isDispensed)
      ) {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          message:
            "This prescription has entered pharmacy processing and can no longer be edited.",
        });
        return;
      }
    } else {
      consultation = new Consultation({
        ...(emergencyCase.patientRef
          ? { patient: emergencyCase.patientRef }
          : {}),
        emergencyCase: emergencyCase._id,
        doctor: req.user?._id,
      });
    }
    if (emergencyCase.patientRef)
      consultation.patient = emergencyCase.patientRef;
    consultation.emergencyCase = emergencyCase._id;
    consultation.doctor = emergencyCase.assignedDoctor!;
    consultation.chiefComplaint = emergencyCase.presentingComplaint;
    consultation.assessment = assessment;
    consultation.diagnosis = diagnosis;
    consultation.advice = advice;
    consultation.medicines = normalizedMedicines;
    consultation.diagnosticOrders = normalizedDiagnosticOrders;
    consultation.status =
      status === ConsultationStatus.COMPLETED
        ? ConsultationStatus.DRAFT
        : status;
    await consultation.save();
    if (status === ConsultationStatus.COMPLETED) {
      for (const order of normalizedDiagnosticOrders) {
        const existingOrder = await DiagnosticOrder.findOne({
          consultation: consultation._id,
          testType: order.testType,
          testName: order.testName,
        });
        if (!existingOrder) {
          const createdOrder = await DiagnosticOrder.create({
            ...(emergencyCase.patientRef
              ? { patient: emergencyCase.patientRef }
              : {}),
            emergencyCase: emergencyCase._id,
            doctor: emergencyCase.assignedDoctor,
            consultation: consultation._id,
            testType: order.testType,
            testName: order.testName,
            priority: order.priority,
            clinicalNotes: order.clinicalNotes,
          });
          const io = getIO();
          const event = {
            orderId: createdOrder._id,
            emergencyCaseId: emergencyCase._id,
          };
          io?.to(
            order.testType === DiagnosticTestType.PATHOLOGY
              ? "lab_technician"
              : "radiologist",
          ).emit("order_created", event);
        }
      }
      consultation.status = ConsultationStatus.COMPLETED;
      await consultation.save();
    }
    emergencyCase.encounterStatus = status;
    emergencyCase.diagnosisSummary = diagnosis || undefined;
    await emergencyCase.save();
    const io = getIO();
    io?.emit("consultation_saved", { consultation });
    io?.emit("emergency:triage_updated", {
      action: "encounter_saved",
      case: formatEmergencyCase(emergencyCase),
    });
    if (
      status === ConsultationStatus.COMPLETED &&
      normalizedMedicines.length > 0
    ) {
      io?.emit("prescription_created", {
        consultationId: consultation._id,
        emergencyCaseId: emergencyCase._id,
      });
    }
    res.status(StatusCodes.OK).json({
      success: true,
      consultation,
      case: formatEmergencyCase(emergencyCase),
      diagnostics: await Promise.all(
        (
          await DiagnosticOrder.find({ consultation: consultation._id })
            .select(
              "testType testName priority status accessionNumber createdAt reportedAt",
            )
            .sort({ createdAt: 1 })
            .lean()
        ).map(async (order) => {
          const report = await DiagnosticReport.findOne({ order: order._id })
            .select(
              "title comments findings fileUrl state structuredResults isCritical createdAt",
            )
            .sort({ createdAt: -1 })
            .lean();
          return {
            ...order,
            report:
              report?.state === "verified"
                ? report
                : report
                  ? { state: report.state, isCritical: report.isCritical }
                  : null,
          };
        }),
      ),
    });
  } catch (error) {
    console.error("Error in saveEmergencyEncounter:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to save ED encounter." });
  }
};

export const getEmergencyMedicationChart = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    if (!mongoose.isValidObjectId(id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Invalid emergency case ID." });
      return;
    }
    const emergencyCase = await EmergencyCase.findOne({
      _id: id,
      isArchived: false,
    });
    if (!emergencyCase) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Active emergency case not found." });
      return;
    }
    const consultation = await Consultation.findOne({
      emergencyCase: emergencyCase._id,
      status: ConsultationStatus.COMPLETED,
    }).lean();
    const administrations = await EmergencyMedicationAdministration.find({
      emergencyCase: emergencyCase._id,
    })
      .populate("recordedBy", "name")
      .sort({ recordedAt: -1 })
      .lean();
    res.status(StatusCodes.OK).json({
      success: true,
      case: formatEmergencyCase(emergencyCase),
      consultation: consultation
        ? { _id: consultation._id, medicines: consultation.medicines }
        : null,
      administrations,
    });
  } catch (error) {
    console.error("Error in getEmergencyMedicationChart:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to load ED medication chart." });
  }
};

export const recordEmergencyMedicationAdministration = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const medicineId =
      typeof req.params.medicineId === "string" ? req.params.medicineId : "";
    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(medicineId)
    ) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Invalid case or medication ID." });
      return;
    }
    const emergencyCase = await EmergencyCase.findOne({
      _id: id,
      isArchived: false,
    });
    if (!emergencyCase) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Active emergency case not found." });
      return;
    }
    const consultation = await Consultation.findOne({
      emergencyCase: emergencyCase._id,
      status: ConsultationStatus.COMPLETED,
    });
    const medicine: any = consultation?.medicines.find(
      (item: any) => item._id?.toString() === medicineId,
    );
    if (!consultation || !medicine) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Signed prescription medicine not found.",
      });
      return;
    }
    const { state, note } = req.body || {};
    const normalizedNote = typeof note === "string" ? note.trim() : "";
    if (
      !["GIVEN", "HELD", "REFUSED"].includes(state) ||
      normalizedNote.length > 1000 ||
      (state !== "GIVEN" && !normalizedNote)
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Choose given, held, or refused. A reason is required when medicine is not given.",
      });
      return;
    }
    const administration = await EmergencyMedicationAdministration.create({
      emergencyCase: emergencyCase._id,
      consultation: consultation._id,
      medicineId: medicine._id,
      medicineName: medicine.name,
      dose: medicine.dosage,
      route: medicine.route || "Not specified",
      state,
      recordedBy: req.user?._id,
      ...(normalizedNote ? { note: normalizedNote } : {}),
    });
    const populated = await EmergencyMedicationAdministration.findById(
      administration._id,
    )
      .populate("recordedBy", "name")
      .lean();
    broadcastEmergencyEvent("emergency:medication_administered", {
      caseId: emergencyCase._id,
      administration: populated,
    });
    await logAudit(
      req.user?.name || "emergency_nurse",
      `Recorded ${state.toLowerCase()} medication for ED case ${emergencyCase.caseId}`,
      emergencyCase.caseId,
      state === "GIVEN" ? "info" : "warn",
    );
    res
      .status(StatusCodes.CREATED)
      .json({ success: true, administration: populated });
  } catch (error) {
    console.error("Error in recordEmergencyMedicationAdministration:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to record medication administration.",
    });
  }
};

const observationFields = {
  heartRate: { min: 0, max: 300, integer: true },
  systolicBP: { min: 0, max: 350, integer: true },
  diastolicBP: { min: 0, max: 250, integer: true },
  respiratoryRate: { min: 0, max: 100, integer: true },
  oxygenSaturation: { min: 0, max: 100, integer: true },
  temperatureC: { min: 25, max: 45, integer: false },
  glasgowComaScale: { min: 3, max: 15, integer: true },
  painScore: { min: 0, max: 10, integer: true },
} as const;

export const getEmergencyObservations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    if (!mongoose.isValidObjectId(id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Invalid emergency case ID." });
      return;
    }
    const emergencyCase = await EmergencyCase.findOne({
      _id: id,
      isArchived: false,
    });
    if (!emergencyCase) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Active emergency case not found." });
      return;
    }
    const observations = await EmergencyObservation.find({ emergencyCase: id })
      .populate("recordedBy", "name")
      .sort({ recordedAt: -1 })
      .lean();
    res.status(StatusCodes.OK).json({ success: true, observations });
  } catch (error) {
    console.error("Error in getEmergencyObservations:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to load nursing observations.",
    });
  }
};

export const createEmergencyObservation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    if (!mongoose.isValidObjectId(id)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Invalid emergency case ID." });
      return;
    }
    const emergencyCase = await EmergencyCase.findOne({
      _id: id,
      isArchived: false,
    });
    if (!emergencyCase) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Active emergency case not found." });
      return;
    }
    const body =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body
        : {};
    const values: Record<string, number> = {};
    for (const [field, range] of Object.entries(observationFields)) {
      if (
        body[field] === undefined ||
        body[field] === null ||
        body[field] === ""
      )
        continue;
      const value = Number(body[field]);
      if (
        !Number.isFinite(value) ||
        value < range.min ||
        value > range.max ||
        (range.integer && !Number.isInteger(value))
      ) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `${field} is outside the accepted range.`,
        });
        return;
      }
      values[field] = value;
    }
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (Object.keys(values).length === 0 && !note) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Enter at least one observation or a nursing note.",
      });
      return;
    }
    if (note.length > 1000) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Nursing note must be 1000 characters or fewer.",
      });
      return;
    }
    if (
      (values.systolicBP === undefined) !==
      (values.diastolicBP === undefined)
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Enter both systolic and diastolic blood pressure values.",
      });
      return;
    }
    if (
      values.systolicBP !== undefined &&
      values.diastolicBP !== undefined &&
      values.systolicBP < values.diastolicBP
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Systolic blood pressure must be greater than diastolic.",
      });
      return;
    }

    const observation = await EmergencyObservation.create({
      emergencyCase: emergencyCase._id,
      recordedBy: req.user?._id,
      ...values,
      ...(note ? { note } : {}),
    });
    const summaryParts = [
      values.heartRate !== undefined ? `HR ${values.heartRate}` : undefined,
      values.systolicBP !== undefined
        ? `BP ${values.systolicBP}/${values.diastolicBP}`
        : undefined,
      values.oxygenSaturation !== undefined
        ? `SpO₂ ${values.oxygenSaturation}%`
        : undefined,
      values.respiratoryRate !== undefined
        ? `RR ${values.respiratoryRate}`
        : undefined,
      values.temperatureC !== undefined
        ? `Temp ${values.temperatureC}°C`
        : undefined,
      values.glasgowComaScale !== undefined
        ? `GCS ${values.glasgowComaScale}`
        : undefined,
      values.painScore !== undefined
        ? `Pain ${values.painScore}/10`
        : undefined,
    ].filter(Boolean);
    emergencyCase.observations =
      [summaryParts.join(" · "), note].filter(Boolean).join(" — ") ||
      emergencyCase.observations;
    await emergencyCase.save();
    const populatedObservation = await EmergencyObservation.findById(
      observation._id,
    )
      .populate("recordedBy", "name")
      .lean();
    broadcastEmergencyEvent("emergency:triage_updated", {
      action: "observation_recorded",
      case: formatEmergencyCase(emergencyCase),
    });
    await logAudit(
      req.user?.name || "emergency_staff",
      `Recorded nursing observations for ED case ${emergencyCase.caseId}`,
      emergencyCase.caseId,
      "info",
    );
    res
      .status(StatusCodes.CREATED)
      .json({ success: true, observation: populatedObservation });
  } catch (error) {
    console.error("Error in createEmergencyObservation:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to save nursing observation." });
  }
};

export const createEmergencyCase = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "A valid intake payload is required.",
      });
      return;
    }
    const {
      patientName,
      age,
      sex,
      presentingComplaint,
      esi,
      area,
      observations,
    } = req.body;

    const normalizedName =
      typeof patientName === "string" ? patientName.trim() : "";
    const normalizedComplaint =
      typeof presentingComplaint === "string" ? presentingComplaint.trim() : "";
    const normalizedAge = typeof age === "number" ? age : Number(age);
    const normalizedEsi = typeof esi === "number" ? esi : Number(esi);
    const normalizedSex = typeof sex === "string" ? sex : "";

    if (
      !normalizedName ||
      normalizedName.length > 120 ||
      age === undefined ||
      age === null ||
      age === "" ||
      !Number.isInteger(normalizedAge) ||
      normalizedAge < 0 ||
      normalizedAge > 130 ||
      !(["M", "F", "O"] as string[]).includes(normalizedSex) ||
      !normalizedComplaint ||
      normalizedComplaint.length > 500 ||
      !Number.isInteger(normalizedEsi) ||
      normalizedEsi < 1 ||
      normalizedEsi > 5 ||
      (area !== undefined &&
        (typeof area !== "string" ||
          !area.trim() ||
          area.trim().length > 80)) ||
      (observations !== undefined &&
        (typeof observations !== "string" || observations.length > 1000))
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Enter a patient name (max 120), age from 0 to 130, valid sex, complaint (max 500), and ESI level 1–5. Area and observations must be valid text.",
      });
      return;
    }

    const caseId = await allocateEmergencyCaseId();

    const newCase = await EmergencyCase.create({
      caseId,
      patientName: normalizedName,
      age: normalizedAge,
      sex: normalizedSex,
      presentingComplaint: normalizedComplaint,
      esi: normalizedEsi,
      area:
        typeof area === "string"
          ? area.trim()
          : normalizedEsi <= 2
            ? "Resus"
            : "Waiting",
      observations: observations?.trim() || "obs pending",
      disposition: "awaiting triage",
    });

    broadcastEmergencyEvent("emergency:triage_updated", {
      action: "created",
      case: newCase,
    });

    await logAudit(
      req.user?.name || "emergency_staff",
      `Intake ED patient ${caseId} (${normalizedName}) - ESI ${newCase.esi}`,
      caseId,
      newCase.esi <= 2 ? "warn" : "info",
    );

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: `Emergency patient intake registered as ${caseId}`,
      case: formatEmergencyCase(newCase),
    });
  } catch (error) {
    console.error("Error in createEmergencyCase:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to create emergency case",
    });
  }
};

export const updateEmergencyCase = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!idParam) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "ID is required" });
      return;
    }
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "A valid update payload is required.",
      });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const allowedFields = [
      "esi",
      "area",
      "observations",
      "disposition",
      "triageNotes",
    ];
    const unsupported = Object.keys(body).filter(
      (key) => !allowedFields.includes(key),
    );
    if (unsupported.length > 0 || Object.keys(body).length === 0) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Only ESI, area, observations, disposition, and triage notes can be updated.",
      });
      return;
    }

    const updateData: Record<string, string | number> = {};
    if ("esi" in body) {
      const esiValue = Number(body.esi);
      if (!Number.isInteger(esiValue) || esiValue < 1 || esiValue > 5) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: "ESI must be from 1 to 5." });
        return;
      }
      updateData.esi = esiValue;
    }
    for (const [field, maxLength] of [
      ["area", 80],
      ["observations", 1000],
      ["triageNotes", 2000],
    ] as const) {
      if (field in body) {
        const value = body[field];
        if (typeof value !== "string" || value.length > maxLength) {
          res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: `${field} must be text up to ${maxLength} characters.`,
          });
          return;
        }
        updateData[field] = value.trim();
      }
    }
    if ("disposition" in body) {
      if (
        !emergencyDispositions.includes(
          body.disposition as (typeof emergencyDispositions)[number],
        )
      ) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: "Invalid emergency disposition." });
        return;
      }
      if (body.disposition === "admitted") {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          message:
            "Use the ward admission handoff to select a ward and reserve capacity.",
        });
        return;
      }
      updateData.disposition = body.disposition as string;
    }
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idParam);
    const filterQuery = isObjectId
      ? { $or: [{ _id: idParam }, { caseId: idParam }] }
      : { caseId: idParam };

    const targetCase = await EmergencyCase.findOne(filterQuery).select("_id");
    if (
      targetCase &&
      (await EmergencyAdmission.exists({
        emergencyCase: targetCase._id,
        status: "ACTIVE",
      })) &&
      ("disposition" in body || "area" in body)
    ) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message:
          "An active inpatient handoff must be closed before changing ED area or disposition.",
      });
      return;
    }

    const updated = await EmergencyCase.findOneAndUpdate(
      filterQuery,
      { $set: updateData },
      { new: true },
    );

    if (!updated) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Emergency case not found",
      });
      return;
    }

    broadcastEmergencyEvent("emergency:triage_updated", {
      action: "updated",
      case: formatEmergencyCase(updated),
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Emergency case updated",
      case: formatEmergencyCase(updated),
    });
  } catch (error) {
    console.error("Error in updateEmergencyCase:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update emergency case",
    });
  }
};

export const dischargeEmergencyCase = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!idParam) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "ID is required" });
      return;
    }
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idParam);
    const filterQuery = isObjectId
      ? { $or: [{ _id: idParam }, { caseId: idParam }] }
      : { caseId: idParam };

    const existingCase = await EmergencyCase.findOne(filterQuery);
    if (!existingCase) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Emergency case not found" });
      return;
    }
    const signedEncounter = await Consultation.findOne({
      emergencyCase: existingCase._id,
      status: ConsultationStatus.COMPLETED,
    }).select("diagnosis advice");
    if (
      !signedEncounter?.diagnosis?.trim() ||
      !signedEncounter.advice?.trim()
    ) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message:
          "A signed clinician encounter with a diagnosis and plan is required before ED discharge.",
      });
      return;
    }
    if (
      existingCase &&
      (await EmergencyAdmission.exists({
        emergencyCase: existingCase._id,
        status: "ACTIVE",
      }))
    ) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message:
          "Close the inpatient admission to release ward capacity before closing this ED case.",
      });
      return;
    }

    const discharged = await EmergencyCase.findOneAndUpdate(
      filterQuery,
      {
        $set: {
          disposition: "for discharge",
          isArchived: true,
          dischargedAt: new Date(),
          ...(req.user?._id ? { dischargedBy: req.user._id } : {}),
        },
      },
      { new: true },
    );

    if (!discharged) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Emergency case not found",
      });
      return;
    }

    broadcastEmergencyEvent("emergency:triage_updated", {
      action: "discharged",
      case: discharged,
    });
    await logAudit(
      req.user?.name || "emergency_staff",
      `Discharged ED case ${discharged.caseId}`,
      discharged.caseId,
      "info",
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Case ${discharged.caseId} marked for discharge`,
      case: discharged,
    });
  } catch (error) {
    console.error("Error in dischargeEmergencyCase:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to discharge emergency case",
    });
  }
};

// ============================================
// 2. Resus Bay Operations
// ============================================

export const createResusBay = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { bayId, airway, lines } = req.body ?? {};
    const normalizedBayId = typeof bayId === "string" ? bayId.trim() : "";
    if (
      !normalizedBayId ||
      normalizedBayId.length > 60 ||
      (airway !== undefined &&
        (typeof airway !== "string" || airway.length > 120)) ||
      (lines !== undefined && (typeof lines !== "string" || lines.length > 120))
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Enter a bay name (max 60 characters) and valid optional setup notes.",
      });
      return;
    }

    const bay = await ResusBay.create({
      bayId: normalizedBayId,
      state: "ready",
      patientSummary: "Unassigned",
      team: "Unassigned",
      airway:
        typeof airway === "string"
          ? airway.trim() || "Not recorded"
          : "Not recorded",
      lines:
        typeof lines === "string"
          ? lines.trim() || "Not recorded"
          : "Not recorded",
      nextIntervention: "No intervention recorded",
    });
    broadcastEmergencyEvent("emergency:bay_updated", bay);
    await logAudit(
      req.user?.name || "emergency_staff",
      `Configured emergency resus bay ${normalizedBayId}`,
      normalizedBayId,
      "info",
    );
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: `Resus bay ${normalizedBayId} configured.`,
      bay,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "A bay with that name is already configured.",
      });
      return;
    }
    console.error("Error in createResusBay:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to configure resus bay",
    });
  }
};

export const getResusBays = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    await removeLegacyEmergencyDemoData();
    const bays = await ResusBay.find().sort({ bayId: 1 });

    const now = Date.now();
    const formattedBays = bays.map((b) => {
      let clock = b.clockDisplay || "—";
      if (b.state === "occupied" && b.occupiedAt) {
        const diffMin = Math.max(
          0,
          Math.floor((now - new Date(b.occupiedAt).getTime()) / 60000),
        );
        clock = `${diffMin} min`;
      }

      return {
        _id: b._id.toString(),
        id: b.bayId,
        state: b.state,
        patient: b.patientSummary,
        team: b.team,
        clock,
        airway: b.airway,
        lines: b.lines,
        next: b.nextIntervention,
      };
    });

    res.status(StatusCodes.OK).json({
      success: true,
      bays: formattedBays,
    });
  } catch (error) {
    console.error("Error in getResusBays:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch resus bays",
    });
  }
};

export const updateResusBay = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const updateData = req.body;

    if (updateData.state === "occupied" && !updateData.occupiedAt) {
      updateData.occupiedAt = new Date();
    } else if (
      updateData.state === "ready" ||
      updateData.state === "cleaning"
    ) {
      updateData.occupiedAt = null;
      if (updateData.state === "ready") {
        updateData.patientSummary = "—";
        updateData.team = "—";
        updateData.nextIntervention = "Available";
      }
    }

    const idParam = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!idParam) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "ID is required" });
      return;
    }
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idParam);
    const filterQuery = isObjectId
      ? { $or: [{ _id: idParam }, { bayId: idParam }] }
      : { bayId: idParam };

    const bay = await ResusBay.findOneAndUpdate(
      filterQuery,
      { $set: updateData },
      { new: true },
    );

    if (!bay) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Resus bay not found",
      });
      return;
    }

    broadcastEmergencyEvent("emergency:bay_updated", bay);

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Resus bay ${bay.bayId} updated`,
      bay,
    });
  } catch (error) {
    console.error("Error in updateResusBay:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update resus bay",
    });
  }
};

export const callResusTeam = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const bayId = idParam || "Resus 1";

    broadcastEmergencyEvent("emergency:resus_alert", {
      bayId,
      calledBy: req.user?.name || "Clinical Lead",
      timestamp: new Date().toISOString(),
      message: `🚨 CODE RESUS CALLED FOR ${bayId} — ALL AVAILABLE CLINICIANS REPORT IMMEDIATELY!`,
    });

    await logAudit(
      req.user?.name || "Clinical Lead",
      `Triggered emergency resus team callout for ${bayId}`,
      bayId,
      "crit",
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Emergency resus team alerted for ${bayId}`,
    });
  } catch (error) {
    console.error("Error in callResusTeam:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to call resus team",
    });
  }
};

export const handoverToIcu = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!idParam) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "ID is required" });
      return;
    }
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idParam);
    const filterQuery = isObjectId
      ? { $or: [{ _id: idParam }, { bayId: idParam }] }
      : { bayId: idParam };

    const bay = await ResusBay.findOneAndUpdate(
      filterQuery,
      {
        $set: {
          state: "cleaning",
          patientSummary: "— (Transferred to ICU)",
          team: "Housekeeping",
          clockDisplay: "0 min",
          nextIntervention: "Cleaning & Restocking",
        },
      },
      { new: true },
    );

    if (!bay) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Resus bay not found",
      });
      return;
    }

    broadcastEmergencyEvent("emergency:bay_updated", bay);

    await logAudit(
      req.user?.name || "ED Team",
      `Handover completed from ${bay.bayId} to Intensive Care Unit (ICU)`,
      bay.bayId,
      "info",
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: `${bay.bayId} patient transferred to ICU. Bay switched to cleaning state.`,
      bay,
    });
  } catch (error) {
    console.error("Error in handoverToIcu:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to handover to ICU",
    });
  }
};

// ============================================
// 3. Inbound Ambulance Operations
// ============================================

export const getInboundAmbulances = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    await removeLegacyEmergencyDemoData();
    const units = await InboundAmbulance.find({ status: "en_route" }).sort({
      etaMinutes: 1,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      units,
    });
  } catch (error) {
    console.error("Error in getInboundAmbulances:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch inbound ambulances",
    });
  }
};

export const createInboundAmbulance = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      unit,
      etaMinutes,
      presentingComplaint,
      esi,
      crew,
      observations,
      prealert,
    } = req.body ?? {};
    const normalizedUnit = typeof unit === "string" ? unit.trim() : "";
    const normalizedComplaint =
      typeof presentingComplaint === "string" ? presentingComplaint.trim() : "";
    const normalizedCrew = typeof crew === "string" ? crew.trim() : "";
    const eta = Number(etaMinutes);
    const acuity = Number(esi);
    if (
      !normalizedUnit ||
      normalizedUnit.length > 40 ||
      !Number.isInteger(eta) ||
      eta < 0 ||
      eta > 1440 ||
      !normalizedComplaint ||
      normalizedComplaint.length > 500 ||
      !Number.isInteger(acuity) ||
      acuity < 1 ||
      acuity > 5 ||
      !normalizedCrew ||
      normalizedCrew.length > 120 ||
      (observations !== undefined &&
        (typeof observations !== "string" || observations.length > 1000)) ||
      (prealert !== undefined && typeof prealert !== "boolean")
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Enter a unit, ETA from 0 to 1440 minutes, complaint, ESI 1–5, crew, and valid observations.",
      });
      return;
    }

    const unitRecord = await InboundAmbulance.create({
      unit: normalizedUnit,
      etaMinutes: eta,
      presentingComplaint: normalizedComplaint,
      esi: acuity,
      crew: normalizedCrew,
      observations:
        typeof observations === "string"
          ? observations.trim() || "obs pending"
          : "obs pending",
      prealert: prealert === true,
      status: "en_route",
    });
    broadcastEmergencyEvent("emergency:inbound_updated", unitRecord);
    await logAudit(
      req.user?.name || "emergency_staff",
      `Registered inbound ambulance ${normalizedUnit} (ETA ${eta} min, ESI ${acuity})`,
      normalizedUnit,
      acuity <= 2 ? "warn" : "info",
    );
    res.status(StatusCodes.CREATED).json({ success: true, unit: unitRecord });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "That ambulance unit is already registered.",
      });
      return;
    }
    console.error("Error in createInboundAmbulance:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to register inbound ambulance",
    });
  }
};

export const recordAmbulanceArrival = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const unit = typeof req.params.unit === "string" ? req.params.unit : "";
    const inbound = await InboundAmbulance.findOne({ unit });
    if (!inbound) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Ambulance unit not found." });
      return;
    }
    if (inbound.emergencyCase) {
      const existingCase = await EmergencyCase.findById(inbound.emergencyCase);
      if (existingCase) {
        res.status(StatusCodes.OK).json({
          success: true,
          message: "Arrival already recorded.",
          case: formatEmergencyCase(existingCase),
          unit: inbound,
        });
        return;
      }
    }

    const recoveredCase = await EmergencyCase.findOne({
      sourceAmbulance: inbound._id,
    });
    if (recoveredCase) {
      const updatedInbound = await InboundAmbulance.findByIdAndUpdate(
        inbound._id,
        {
          $set: {
            status: "arrived",
            emergencyCase: recoveredCase._id,
            etaMinutes: 0,
          },
        },
        { new: true },
      );
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Arrival already recorded.",
        case: formatEmergencyCase(recoveredCase),
        unit: updatedInbound,
      });
      return;
    }
    if (inbound.status !== "en_route") {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: `This unit is marked ${inbound.status} and cannot be received as an arrival.`,
      });
      return;
    }

    if (inbound.assignedBay) {
      const receivingBay = await ResusBay.findOne({
        bayId: inbound.assignedBay,
      });
      if (!receivingBay || receivingBay.state !== "ready") {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          message:
            "The assigned bay is no longer ready. Reassign this unit before recording arrival.",
        });
        return;
      }
    }

    const { patientName, age, sex } = req.body ?? {};
    const normalizedName =
      typeof patientName === "string" ? patientName.trim() : "";
    const normalizedAge = typeof age === "number" ? age : Number(age);
    if (
      !normalizedName ||
      normalizedName.length > 120 ||
      age === undefined ||
      age === null ||
      age === "" ||
      !Number.isInteger(normalizedAge) ||
      normalizedAge < 0 ||
      normalizedAge > 130 ||
      !(["M", "F", "O"] as string[]).includes(sex)
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Enter a patient name (use Unknown patient if unidentified), age from 0 to 130, and valid sex.",
      });
      return;
    }

    let emergencyCase = await EmergencyCase.findOne({
      sourceAmbulance: inbound._id,
    });
    if (!emergencyCase) {
      emergencyCase = await EmergencyCase.create({
        caseId: await allocateEmergencyCaseId(),
        patientName: normalizedName,
        age: normalizedAge,
        sex,
        presentingComplaint: inbound.presentingComplaint,
        esi: inbound.esi,
        area: inbound.assignedBay || (inbound.esi <= 2 ? "Resus" : "Waiting"),
        observations: inbound.observations || "obs pending",
        disposition: "awaiting triage",
        sourceAmbulance: inbound._id,
      });
    }

    let bayAvailable = true;
    if (inbound.assignedBay) {
      const occupiedBay = await ResusBay.findOneAndUpdate(
        { bayId: inbound.assignedBay, state: "ready" },
        {
          $set: {
            state: "occupied",
            patientSummary: `${normalizedName} · ${inbound.presentingComplaint}`,
            team: inbound.crew,
            occupiedAt: new Date(),
            nextIntervention: "Initial clinical assessment",
          },
        },
        { new: true },
      );
      bayAvailable = Boolean(occupiedBay);
      if (occupiedBay) {
        emergencyCase.area = occupiedBay.bayId;
        emergencyCase.disposition = "in bay";
        await emergencyCase.save();
        broadcastEmergencyEvent("emergency:bay_updated", occupiedBay);
      } else {
        emergencyCase.area = "Waiting";
        emergencyCase.disposition = "awaiting triage";
        await emergencyCase.save();
      }
    }

    const updatedInbound = await InboundAmbulance.findByIdAndUpdate(
      inbound._id,
      {
        $set: {
          status: "arrived",
          emergencyCase: emergencyCase._id,
          etaMinutes: 0,
        },
        ...(!bayAvailable ? { $unset: { assignedBay: 1 } } : {}),
      },
      { new: true },
    );
    broadcastEmergencyEvent("emergency:inbound_updated", updatedInbound);
    broadcastEmergencyEvent("emergency:triage_updated", {
      action: "created",
      case: emergencyCase,
    });
    await logAudit(
      req.user?.name || "emergency_staff",
      `Ambulance ${unit} arrived and patient registered as ${emergencyCase.caseId}`,
      emergencyCase.caseId,
      emergencyCase.esi <= 2 ? "warn" : "info",
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: bayAvailable
        ? `Arrival recorded as ${emergencyCase.caseId}`
        : `Arrival recorded as ${emergencyCase.caseId}; the bay became unavailable, so the case is awaiting triage.`,
      case: formatEmergencyCase(emergencyCase),
      unit: updatedInbound,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      const unit = typeof req.params.unit === "string" ? req.params.unit : "";
      const inbound = await InboundAmbulance.findOne({ unit });
      const existingCase = inbound
        ? await EmergencyCase.findOne({ sourceAmbulance: inbound._id })
        : null;
      if (existingCase) {
        const updatedInbound = await InboundAmbulance.findByIdAndUpdate(
          inbound?._id,
          {
            $set: {
              status: "arrived",
              emergencyCase: existingCase._id,
              etaMinutes: 0,
            },
          },
          { new: true },
        );
        res.status(StatusCodes.OK).json({
          success: true,
          message: "Arrival already recorded.",
          case: formatEmergencyCase(existingCase),
          unit: updatedInbound,
        });
        return;
      }
    }
    console.error("Error in recordAmbulanceArrival:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to record ambulance arrival" });
  }
};

export const assignAmbulanceBay = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const unit = typeof req.params.unit === "string" ? req.params.unit : "";
    const { bay } = req.body;
    if (typeof bay !== "string" || !bay.trim()) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Select a configured receiving bay.",
      });
      return;
    }
    const configuredBay = await ResusBay.findOne({ bayId: bay.trim() });
    if (!configuredBay) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "That bay is not configured in the emergency department.",
      });
      return;
    }
    if (
      configuredBay.state === "occupied" ||
      configuredBay.state === "maintenance"
    ) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "That bay is not available to receive an ambulance.",
      });
      return;
    }
    if (configuredBay.state !== "ready") {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "That bay must be marked ready before assignment.",
      });
      return;
    }
    const otherReservation = await InboundAmbulance.exists({
      unit: { $ne: unit },
      assignedBay: bay.trim(),
      status: "en_route",
    });
    if (otherReservation) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "That bay is already assigned to another inbound unit.",
      });
      return;
    }

    const assigned = await InboundAmbulance.findOneAndUpdate(
      { unit },
      { $set: { assignedBay: bay.trim() } },
      { new: true },
    );

    if (!assigned) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Ambulance unit not found",
      });
      return;
    }

    broadcastEmergencyEvent("emergency:inbound_updated", assigned);

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Bay ${assigned.assignedBay} assigned to unit ${unit}`,
      unit: assigned,
    });
  } catch (error) {
    console.error("Error in assignAmbulanceBay:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to assign ambulance bay",
    });
  }
};

// ============================================
// 4. Major Incident / Disaster Operations
// ============================================

export const saveMajorIncidentConfig = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "A valid incident plan is required.",
      });
      return;
    }
    const { surgeBeds, theatresArmed, staffRecalled, steps } = req.body;
    const capacities = [surgeBeds, theatresArmed, staffRecalled];
    if (
      capacities.some(
        (value) => !Number.isInteger(value) || value < 0 || value > 10000,
      ) ||
      !Array.isArray(steps) ||
      steps.length < 1 ||
      steps.length > 30 ||
      steps.some(
        (step) =>
          typeof step?.text !== "string" ||
          !step.text.trim() ||
          step.text.trim().length > 300,
      )
    ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Enter non-negative whole-number capacities and 1–30 checklist steps (each up to 300 characters).",
      });
      return;
    }

    let incident = await MajorIncident.findOne();
    if (incident?.isArmed) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message:
          "Disarm the current major incident before changing its approved plan.",
      });
      return;
    }
    if (!incident) incident = new MajorIncident();
    incident.isConfigured = true;
    incident.configuredAt = new Date();
    incident.configuredBy = req.user?.name || "Emergency department staff";
    incident.surgeBeds = surgeBeds;
    incident.theatresArmed = theatresArmed;
    incident.staffRecalled = staffRecalled;
    incident.steps = steps.map((step: { text: string }) => ({
      text: step.text.trim(),
      completed: false,
    })) as typeof incident.steps;
    await incident.save();
    broadcastEmergencyEvent("emergency:incident_updated", incident);
    await logAudit(
      req.user?.name || "Emergency department staff",
      "Configured hospital major incident plan",
      "DISASTER_MODE",
      "warn",
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Hospital incident plan saved.",
      incident,
    });
  } catch (error) {
    console.error("Error in saveMajorIncidentConfig:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Failed to save incident plan." });
  }
};

export const getMajorIncident = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    await removeLegacyEmergencyDemoData();
    const record = await MajorIncident.findOne({ isConfigured: true });
    const incident = record || null;

    res.status(StatusCodes.OK).json({
      success: true,
      incident,
    });
  } catch (error) {
    console.error("Error in getMajorIncident:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to fetch major incident status",
    });
  }
};

export const toggleMajorIncident = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await removeLegacyEmergencyDemoData();
    const { armed } = req.body;

    let incident = await MajorIncident.findOne({ isConfigured: true });
    if (!incident) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message:
          "Configure an approved major incident plan before arming this mode.",
      });
      return;
    }

    incident.isArmed = Boolean(armed);
    if (incident.isArmed) {
      incident.armedAt = new Date();
      incident.armedBy = req.user?.name || "ED Incident Commander";
    } else {
      incident.armedAt = undefined;
      incident.armedBy = undefined;
    }

    await incident.save();

    broadcastEmergencyEvent("emergency:incident_updated", incident);

    await logAudit(
      req.user?.name || "Incident Commander",
      incident.isArmed
        ? "🚨 MASS CASUALTY / MAJOR INCIDENT PROTOCOL ARMED"
        : "Stand down: Major Incident protocol disarmed",
      "DISASTER_MODE",
      incident.isArmed ? "crit" : "warn",
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: incident.isArmed
        ? "MAJOR INCIDENT MODE ARMED: Surge capacity released"
        : "Major incident mode returned to standby",
      incident,
    });
  } catch (error) {
    console.error("Error in toggleMajorIncident:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to toggle major incident mode",
    });
  }
};

export const toggleCascadeStep = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await removeLegacyEmergencyDemoData();
    const indexParam = Array.isArray(req.params.index)
      ? req.params.index[0]
      : req.params.index;
    const { completed } = req.body;
    const stepIdx = parseInt(indexParam || "0", 10);

    const incident = await MajorIncident.findOne({ isConfigured: true });
    if (!incident || !incident.steps[stepIdx]) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Step not found in action cascade",
      });
      return;
    }

    incident.steps[stepIdx].completed =
      typeof completed === "boolean"
        ? completed
        : !incident.steps[stepIdx].completed;
    if (incident.steps[stepIdx].completed) {
      incident.steps[stepIdx].completedAt = new Date();
      incident.steps[stepIdx].completedBy = req.user?.name || "ED Clinician";
    } else {
      incident.steps[stepIdx].completedAt = undefined;
      incident.steps[stepIdx].completedBy = undefined;
    }

    incident.markModified("steps");
    await incident.save();

    broadcastEmergencyEvent("emergency:incident_updated", incident);

    res.status(StatusCodes.OK).json({
      success: true,
      step: incident.steps[stepIdx],
      incident,
    });
  } catch (error) {
    console.error("Error in toggleCascadeStep:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update cascade step",
    });
  }
};
