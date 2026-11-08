// ============================================
// HealOS Server — Emergency Controller
// ============================================
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import {
  EmergencyCase,
  ResusBay,
  InboundAmbulance,
  MajorIncident,
  User,
  UserRole,
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

export const getEmergencyStats = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    await removeLegacyEmergencyDemoData();
    const activeCases = await EmergencyCase.find({ isArchived: false });
    const totalInDept = activeCases.length;
    const awaitingTriage = activeCases.filter(
      (c) => c.disposition === "awaiting triage",
    ).length;

    const now = Date.now();
    const waitTimes = activeCases.map((c) =>
      Math.max(0, Math.floor((now - new Date(c.arrivedAt).getTime()) / 60000)),
    );

    // 4-hour breaches (> 240 mins)
    const fourHourBreaches = waitTimes.filter((w) => w > 240).length;

    res.status(StatusCodes.OK).json({
      success: true,
      stats: {
        totalInDept,
        awaitingTriage,
        medianTimeToClinician: "—",
        fourHourBreaches,
      },
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

    const cases = await EmergencyCase.find(query).sort({
      esi: 1,
      arrivedAt: 1,
    });

    const formattedCases = cases.map(formatEmergencyCase);

    res.status(StatusCodes.OK).json({
      success: true,
      cases: formattedCases,
      count: formattedCases.length,
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
      updateData.disposition = body.disposition as string;
    }
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idParam);
    const filterQuery = isObjectId
      ? { $or: [{ _id: idParam }, { caseId: idParam }] }
      : { caseId: idParam };

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

    const discharged = await EmergencyCase.findOneAndUpdate(
      filterQuery,
      { $set: { disposition: "for discharge", isArchived: true } },
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
