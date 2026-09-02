// ============================================
// HealOS Server — Emergency Controller
// ============================================
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  EmergencyCase,
  ResusBay,
  InboundAmbulance,
  MajorIncident,
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

// ============================================
// Default Seed Data
// ============================================
export const ensureEmergencyDataSeeded = async () => {
  try {
    const caseCount = await EmergencyCase.countDocuments();
    if (caseCount === 0) {
      const now = Date.now();
      await EmergencyCase.create([
        {
          caseId: "ED-4412",
          patientName: "Unknown male",
          age: 55,
          sex: "M",
          presentingComplaint: "Cardiac arrest · ROSC en route",
          esi: 1,
          arrivedAt: new Date(now - 12 * 60 * 1000),
          area: "Resus 1",
          observations: "HR 118 · BP 84/50 · SpO2 91%",
          disposition: "in bay",
        },
        {
          caseId: "ED-4411",
          patientName: "Sana Qureshi",
          age: 34,
          sex: "F",
          presentingComplaint: "Severe asthma, silent chest",
          esi: 2,
          arrivedAt: new Date(now - 26 * 60 * 1000),
          area: "Resus 2",
          observations: "RR 32 · SpO2 88% · PEF 30%",
          disposition: "in bay",
        },
        {
          caseId: "ED-4409",
          patientName: "Tom Whelan",
          age: 68,
          sex: "M",
          presentingComplaint: "Central chest pain, ST changes",
          esi: 2,
          arrivedAt: new Date(now - 39 * 60 * 1000),
          area: "Acute 4",
          observations: "HR 96 · BP 148/88 · Trop pending",
          disposition: "awaiting bed",
        },
        {
          caseId: "ED-4408",
          patientName: "Meera Joshi",
          age: 41,
          sex: "F",
          presentingComplaint: "RIF pain, vomiting",
          esi: 3,
          arrivedAt: new Date(now - 60 * 60 * 1000),
          area: "Majors 7",
          observations: "HR 102 · T 38.1",
          disposition: "in bay",
        },
        {
          caseId: "ED-4405",
          patientName: "Kofi Mensah",
          age: 23,
          sex: "M",
          presentingComplaint: "Ankle injury, weight-bearing",
          esi: 4,
          arrivedAt: new Date(now - 89 * 60 * 1000),
          area: "Minors",
          observations: "obs normal",
          disposition: "in bay",
        },
        {
          caseId: "ED-4402",
          patientName: "Elsie Barnes",
          age: 79,
          sex: "F",
          presentingComplaint: "Mechanical fall, no LOC",
          esi: 3,
          arrivedAt: new Date(now - 118 * 60 * 1000),
          area: "Waiting",
          observations: "HR 84 · BP 132/70",
          disposition: "awaiting triage",
        },
      ]);
      console.log("🚑 Default ED emergency cases seeded successfully.");
    }

    const bayCount = await ResusBay.countDocuments();
    if (bayCount === 0) {
      await ResusBay.create([
        {
          bayId: "Resus 1",
          state: "occupied",
          patientSummary: "Unknown male · post-arrest",
          team: "Dr. Varma + 3",
          occupiedAt: new Date(Date.now() - 12 * 60 * 1000),
          clockDisplay: "12 min",
          airway: "ETT 8.0",
          lines: "IO humeral, R IJ",
          nextIntervention: "Repeat gas 14:20",
        },
        {
          bayId: "Resus 2",
          state: "occupied",
          patientSummary: "Sana Qureshi · asthma",
          team: "Dr. Bose + 2",
          occupiedAt: new Date(Date.now() - 26 * 60 * 1000),
          clockDisplay: "26 min",
          airway: "NIV mask",
          lines: "2 × 18G",
          nextIntervention: "Mg infusion running",
        },
        {
          bayId: "Resus 3",
          state: "ready",
          patientSummary: "—",
          team: "—",
          clockDisplay: "—",
          airway: "checked 12:00",
          lines: "trolley stocked",
          nextIntervention: "Available",
        },
        {
          bayId: "Resus 4",
          state: "cleaning",
          patientSummary: "—",
          team: "Housekeeping",
          clockDisplay: "4 min",
          airway: "restock due",
          lines: "—",
          nextIntervention: "Ready ~14:15",
        },
      ]);
      console.log("🩺 Default Resus bays seeded successfully.");
    }

    const inboundCount = await InboundAmbulance.countDocuments();
    if (inboundCount === 0) {
      await InboundAmbulance.create([
        {
          unit: "AMB-21",
          etaMinutes: 3,
          presentingComplaint: "STEMI, pre-alert",
          esi: 1,
          crew: "Paramedic Shah",
          observations: "HR 52 · BP 92/60 · anterior ST↑",
          prealert: true,
          progress: 0.86,
        },
        {
          unit: "AMB-07",
          etaMinutes: 9,
          presentingComplaint: "RTC, ?pelvic fracture",
          esi: 2,
          crew: "Paramedic Cole",
          observations: "HR 110 · BP 104/68 · GCS 15",
          prealert: true,
          progress: 0.58,
        },
        {
          unit: "AMB-14",
          etaMinutes: 17,
          presentingComplaint: "Elderly fall, hip pain",
          esi: 3,
          crew: "Tech Grewal",
          observations: "obs stable",
          prealert: false,
          progress: 0.3,
        },
      ]);
      console.log("🚨 Default Inbound ambulances seeded successfully.");
    }

    const incidentCount = await MajorIncident.countDocuments();
    if (incidentCount === 0) {
      await MajorIncident.create({
        isArmed: false,
        surgeBeds: 42,
        theatresArmed: 3,
        staffRecalled: 68,
        steps: [
          { text: "Declare major incident to switchboard (dial 2222)", completed: false },
          { text: "Open casualty clearing area and label triage sieve packs", completed: false },
          { text: "Stand up second theatre and recall on-call surgical team", completed: false },
          { text: "Discharge-to-assess sweep on wards 2, 3 and 5", completed: false },
          { text: "Open blood bank major haemorrhage protocol", completed: false },
          { text: "Notify regional control and press office", completed: false },
        ],
      });
      console.log("🛡️ Default Major Incident protocols seeded successfully.");
    }
  } catch (err) {
    console.error("Error ensuring emergency seed data:", err);
  }
};

// ============================================
// 1. Triage Board Operations
// ============================================

export const getEmergencyStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureEmergencyDataSeeded();

    const activeCases = await EmergencyCase.find({ isArchived: false });
    const totalInDept = activeCases.length;
    const awaitingTriage = activeCases.filter(
      (c) => c.disposition === "awaiting triage"
    ).length;

    const now = Date.now();
    const waitTimes = activeCases.map((c) =>
      Math.max(0, Math.floor((now - new Date(c.arrivedAt).getTime()) / 60000))
    );

    // Median wait time
    let medianWait = 18;
    if (waitTimes.length > 0) {
      const sorted = [...waitTimes].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const val = sorted[mid] ?? 0;
      const prev = sorted[mid - 1] ?? 0;
      medianWait = sorted.length % 2 !== 0 ? val : Math.round((prev + val) / 2);
    }

    // 4-hour breaches (> 240 mins)
    const fourHourBreaches = waitTimes.filter((w) => w > 240).length;

    res.status(StatusCodes.OK).json({
      success: true,
      stats: {
        totalInDept,
        awaitingTriage,
        medianTimeToClinician: `${medianWait || 18} min`,
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

export const getTriageCases = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureEmergencyDataSeeded();

    const { filter } = req.query;
    let query: any = { isArchived: false };

    if (filter === "esi12") {
      query.esi = { $in: [1, 2] };
    } else if (filter === "waiting") {
      query.disposition = "awaiting triage";
    }

    const cases = await EmergencyCase.find(query).sort({ esi: 1, arrivedAt: 1 });

    const now = Date.now();
    const formattedCases = cases.map((c) => {
      const arrivedDate = new Date(c.arrivedAt);
      const waitMin = Math.max(0, Math.floor((now - arrivedDate.getTime()) / 60000));
      const hours = String(arrivedDate.getHours()).padStart(2, "0");
      const minutes = String(arrivedDate.getMinutes()).padStart(2, "0");

      return {
        _id: c._id.toString(),
        id: c.caseId,
        patient: c.patientName,
        age: c.age,
        sex: c.sex,
        complaint: c.presentingComplaint,
        esi: c.esi,
        arrived: `${hours}:${minutes}`,
        arrivedAt: c.arrivedAt.toISOString(),
        waitMin,
        area: c.area,
        obs: c.observations,
        disposition: c.disposition,
        assignedDoctorName: c.assignedDoctorName,
        triageNotes: c.triageNotes,
      };
    });

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

export const createEmergencyCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      patientName,
      age,
      sex,
      presentingComplaint,
      esi,
      area,
      observations,
      disposition,
      triageNotes,
    } = req.body;

    if (!patientName || age === undefined || !sex || !presentingComplaint) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "patientName, age, sex, and presentingComplaint are required",
      });
      return;
    }

    // Generate consecutive caseId (e.g. ED-4413)
    const count = await EmergencyCase.countDocuments();
    const caseId = `ED-${4400 + count + 1}`;

    const newCase = await EmergencyCase.create({
      caseId,
      patientName,
      age: Number(age),
      sex,
      presentingComplaint,
      esi: Number(esi) || 3,
      area: area || (Number(esi) <= 2 ? "Resus" : "Waiting"),
      observations: observations || "obs pending",
      disposition: disposition || "awaiting triage",
      triageNotes,
      assignedDoctor: req.user?._id,
      assignedDoctorName: req.user?.name,
    });

    broadcastEmergencyEvent("emergency:triage_updated", { action: "created", case: newCase });

    await logAudit(
      req.user?.name || "emergency_staff",
      `Intake ED patient ${caseId} (${patientName}) - ESI ${newCase.esi}`,
      caseId,
      newCase.esi <= 2 ? "warn" : "info"
    );

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: `Emergency patient intake registered as ${caseId}`,
      case: newCase,
    });
  } catch (error) {
    console.error("Error in createEmergencyCase:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to create emergency case",
    });
  }
};

export const updateEmergencyCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!idParam) {
      res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "ID is required" });
      return;
    }
    const updateData = req.body;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idParam);
    const filterQuery = isObjectId ? { $or: [{ _id: idParam }, { caseId: idParam }] } : { caseId: idParam };

    const updated = await EmergencyCase.findOneAndUpdate(
      filterQuery,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Emergency case not found",
      });
      return;
    }

    broadcastEmergencyEvent("emergency:triage_updated", { action: "updated", case: updated });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Emergency case updated",
      case: updated,
    });
  } catch (error) {
    console.error("Error in updateEmergencyCase:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update emergency case",
    });
  }
};

export const dischargeEmergencyCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!idParam) {
      res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "ID is required" });
      return;
    }
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idParam);
    const filterQuery = isObjectId ? { $or: [{ _id: idParam }, { caseId: idParam }] } : { caseId: idParam };

    const discharged = await EmergencyCase.findOneAndUpdate(
      filterQuery,
      { $set: { disposition: "for discharge", isArchived: true } },
      { new: true }
    );

    if (!discharged) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Emergency case not found",
      });
      return;
    }

    broadcastEmergencyEvent("emergency:triage_updated", { action: "discharged", case: discharged });

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

export const getResusBays = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureEmergencyDataSeeded();

    const bays = await ResusBay.find().sort({ bayId: 1 });

    const now = Date.now();
    const formattedBays = bays.map((b) => {
      let clock = b.clockDisplay || "—";
      if (b.state === "occupied" && b.occupiedAt) {
        const diffMin = Math.max(0, Math.floor((now - new Date(b.occupiedAt).getTime()) / 60000));
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

export const updateResusBay = async (req: Request, res: Response): Promise<void> => {
  try {
    const updateData = req.body;

    if (updateData.state === "occupied" && !updateData.occupiedAt) {
      updateData.occupiedAt = new Date();
    } else if (updateData.state === "ready" || updateData.state === "cleaning") {
      updateData.occupiedAt = null;
      if (updateData.state === "ready") {
        updateData.patientSummary = "—";
        updateData.team = "—";
        updateData.nextIntervention = "Available";
      }
    }

    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!idParam) {
      res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "ID is required" });
      return;
    }
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idParam);
    const filterQuery = isObjectId ? { $or: [{ _id: idParam }, { bayId: idParam }] } : { bayId: idParam };

    const bay = await ResusBay.findOneAndUpdate(
      filterQuery,
      { $set: updateData },
      { new: true }
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

export const callResusTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
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
      "crit"
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

export const handoverToIcu = async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!idParam) {
      res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "ID is required" });
      return;
    }
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idParam);
    const filterQuery = isObjectId ? { $or: [{ _id: idParam }, { bayId: idParam }] } : { bayId: idParam };

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
      { new: true }
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
      "info"
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

export const getInboundAmbulances = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureEmergencyDataSeeded();

    const units = await InboundAmbulance.find({ status: "en_route" }).sort({ etaMinutes: 1 });

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

export const assignAmbulanceBay = async (req: Request, res: Response): Promise<void> => {
  try {
    const { unit } = req.params;
    const { bay } = req.body;

    const assigned = await InboundAmbulance.findOneAndUpdate(
      { unit },
      { $set: { assignedBay: bay || "Resus 1" } },
      { new: true }
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

export const getMajorIncident = async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureEmergencyDataSeeded();

    let incident = await MajorIncident.findOne();
    if (!incident) {
      incident = await MajorIncident.create({ isArmed: false, steps: [] });
    }

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

export const toggleMajorIncident = async (req: Request, res: Response): Promise<void> => {
  try {
    const { armed } = req.body;

    let incident = await MajorIncident.findOne();
    if (!incident) {
      incident = new MajorIncident();
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
      incident.isArmed ? "crit" : "warn"
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

export const toggleCascadeStep = async (req: Request, res: Response): Promise<void> => {
  try {
    const indexParam = Array.isArray(req.params.index) ? req.params.index[0] : req.params.index;
    const { completed } = req.body;
    const stepIdx = parseInt(indexParam || "0", 10);

    const incident = await MajorIncident.findOne();
    if (!incident || !incident.steps[stepIdx]) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Step not found in action cascade",
      });
      return;
    }

    incident.steps[stepIdx].completed =
      typeof completed === "boolean" ? completed : !incident.steps[stepIdx].completed;
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
