import { Request, Response } from "express";
import {
  Appointment,
  Consultation,
  ConsultationStatus,
  DiagnosticOrder,
  generateSpecimenBarcode,
  DiagnosticReport,
  ProfessionalProfile,
  User,
  ClinicalNote,
  Handover,
  Schedule,
  DoctorAvailability,
} from "../models/index.js";
import { AppError } from "../middleware/error-handler.js";
import ImageKit from "imagekit";
import fs from "fs";
import { z } from "zod";
import { getIO } from "../socket.js";
import {
  getClinicDateKey,
  getClinicMinutesOfDay,
} from "../utils/clinic-date.js";

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_key",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_key",
  urlEndpoint:
    process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/your_endpoint",
});

// ==========================================
// 1. Get Doctor's Appointments
// ==========================================
export const getAppointments = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?.id;
    // For now, fetch all pending appointments for this doctor
    const appointments = await Appointment.find({
      doctor: doctorId,
    })
      .select("patient date timeSlot status type paymentStatus reason")
      .populate("patient", "firstName lastName email avatar role")
      .sort({ date: 1, timeSlot: 1 })
      .lean();

    res.status(200).json({
      status: "success",
      data: { appointments },
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch appointments" });
  }
};

// ==========================================
// 2. Create or Update Consultation (Prescription)
// ==========================================
const consultationPayloadSchema = z
  .object({
    patientId: z.string().regex(/^[a-f\d]{24}$/i, "Valid patient is required"),
    appointmentId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Invalid appointment")
      .optional(),
    chiefComplaint: z.string().trim().max(2000).default(""),
    diagnosis: z.string().trim().max(2000).default(""),
    advice: z.string().trim().max(4000).default(""),
    followUpDate: z.string().optional(),
    medicines: z
      .array(
        z.object({
          name: z.string().trim().min(1),
          dosage: z.string().trim().min(1),
          frequency: z.string().trim().min(1),
          duration: z.string().trim().min(1),
          instructions: z.string().trim().optional(),
        }),
      )
      .default([]),
    diagnosticOrders: z
      .array(
        z.object({
          testType: z.enum(["RADIOLOGY", "PATHOLOGY"]),
          testName: z.string().trim().min(2),
          clinicalNotes: z.string().trim().optional(),
          priority: z.enum(["ROUTINE", "URGENT", "STAT"]).optional(),
        }),
      )
      .default([]),
    status: z.enum(["DRAFT", "COMPLETED"]).default("DRAFT"),
  })
  .superRefine((data, context) => {
    if (data.status === "COMPLETED") {
      if (data.chiefComplaint.length < 3) {
        context.addIssue({
          code: "custom",
          path: ["chiefComplaint"],
          message: "Enter the patient's chief complaint before completing.",
        });
      }
      if (data.diagnosis.length < 2) {
        context.addIssue({
          code: "custom",
          path: ["diagnosis"],
          message: "Diagnosis is required before completing.",
        });
      }
    }
    if (
      data.followUpDate &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(data.followUpDate) ||
        Number.isNaN(new Date(`${data.followUpDate}T12:00:00`).getTime()))
    ) {
      context.addIssue({
        code: "custom",
        path: ["followUpDate"],
        message: "Enter a valid follow-up date.",
      });
    }
  });

export const saveConsultation = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?.id;
    const parsed = consultationPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        message:
          "Complete the required consultation fields and check your entries.",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const {
      patientId,
      appointmentId,
      chiefComplaint,
      diagnosis,
      advice,
      followUpDate,
      medicines,
      diagnosticOrders,
      status,
    } = parsed.data;

    const patientExists = await User.exists({
      _id: patientId,
      role: "PATIENT",
    });
    if (!patientExists) throw new AppError("Patient not found", 404);

    if (appointmentId) {
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        doctor: doctorId,
        patient: patientId,
      }).select("status");
      if (!appointment) throw new AppError("Appointment not found", 404);
      if (appointment.status === "CANCELLED")
        throw new AppError("A cancelled appointment cannot be completed", 409);
    }

    // Check if consultation for this appointment already exists
    let consultation;
    if (appointmentId) {
      consultation = await Consultation.findOne({
        appointment: appointmentId,
        doctor: doctorId,
      });
    }

    if (consultation) {
      // Update existing
      consultation.chiefComplaint = chiefComplaint;
      consultation.diagnosis = diagnosis;
      consultation.advice = advice;
      consultation.medicines = medicines;
      if (diagnosticOrders) consultation.diagnosticOrders = diagnosticOrders;
      consultation.followUpDate = followUpDate
        ? new Date(`${followUpDate}T12:00:00`)
        : undefined;
      consultation.status = status as ConsultationStatus;
      await consultation.save();
    } else {
      // Create new
      consultation = await Consultation.create({
        patient: patientId,
        doctor: doctorId,
        appointment: appointmentId,
        chiefComplaint,
        diagnosis,
        advice,
        followUpDate: followUpDate
          ? new Date(`${followUpDate}T12:00:00`)
          : undefined,
        medicines,
        diagnosticOrders,
        status,
      });
    }

    // If completed, update appointment status
    if (status === "COMPLETED" && appointmentId) {
      const completedAppointment = await Appointment.findOneAndUpdate(
        { _id: appointmentId, doctor: doctorId },
        { status: "COMPLETED" },
        { new: true },
      ).select("_id doctor patient status");
      if (completedAppointment) {
        getIO()?.emit("appointment_updated", {
          appointmentId: completedAppointment._id,
          doctorId: completedAppointment.doctor,
          patientId: completedAppointment.patient,
          status: completedAppointment.status,
        });
      }
    }

    // Process diagnosticOrders
    if (diagnosticOrders.length > 0) {
      const existingOrders = await DiagnosticOrder.find({
        consultation: consultation._id,
      })
        .select("testType testName")
        .lean();
      const existingKeys = new Set(
        existingOrders.map(
          (order) => `${order.testType}:${order.testName.toLowerCase()}`,
        ),
      );
      const ordersToCreate = diagnosticOrders
        .filter(
          (order) =>
            !existingKeys.has(
              `${order.testType}:${order.testName.toLowerCase()}`,
            ),
        )
        .map((order) => ({
          patient: patientId,
          doctor: doctorId,
          consultation: consultation._id,
          testType: order.testType,
          testName: order.testName,
          priority: order.priority || "ROUTINE",
          clinicalNotes: order.clinicalNotes || chiefComplaint,
          ...(order.testType === "PATHOLOGY"
            ? {
                specimenBarcode: generateSpecimenBarcode(),
                specimenStatus: "AWAITING_COLLECTION",
                specimenHistory: [
                  { event: "ORDERED", performedBy: doctorId, at: new Date() },
                ],
              }
            : {}),
        }));
      if (ordersToCreate.length > 0)
        await DiagnosticOrder.insertMany(ordersToCreate);
    }

    const io = getIO();
    if (io) {
      io.emit("consultation_saved", { consultation });
      if (diagnosticOrders && diagnosticOrders.length > 0) {
        io.emit("order_created");
      }
    }

    res.status(200).json({
      status: "success",
      data: { consultation },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to save consultation",
    });
  }
};

// ==========================================
// 3. Create Diagnostic Order
// ==========================================
export const orderDiagnostic = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?.id;
    const {
      patientId,
      consultationId,
      testType,
      testName,
      priority,
      clinicalNotes,
    } = req.body;

    if (!patientId || !testType || !testName) {
      throw new AppError(
        "Patient ID, testType, and testName are required",
        400,
      );
    }

    const order = await DiagnosticOrder.create({
      patient: patientId,
      doctor: doctorId,
      consultation: consultationId,
      testType,
      testName,
      priority,
      clinicalNotes,
      ...(testType === "PATHOLOGY"
        ? {
            specimenBarcode: generateSpecimenBarcode(),
            specimenStatus: "AWAITING_COLLECTION",
            specimenHistory: [
              { event: "ORDERED", performedBy: doctorId, at: new Date() },
            ],
          }
        : {}),
    });

    const io = getIO();
    if (io) {
      const event = { orderId: order._id };
      io.to(
        order.testType === "PATHOLOGY" ? "lab_technician" : "radiologist",
      ).emit("order_created", event);
    }

    res.status(201).json({
      status: "success",
      data: { order },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to order diagnostic",
    });
  }
};

// ==========================================
// 4. Get Patient Medical History
// ==========================================
export const getPatientHistory = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?._id;
    const { id: patientId } = req.params;

    // Authorization check: ensure the doctor has or had an appointment with this patient
    const hasAccess = await Appointment.exists({
      doctor: doctorId,
      patient: patientId,
    });
    if (!hasAccess && req.user?.role !== "ADMIN") {
      throw new AppError(
        "You are not authorized to view this patient's history",
        403,
      );
    }

    const consultations = await Consultation.find({ patient: patientId })
      .populate("doctor", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    const diagnosticOrders = await DiagnosticOrder.find({ patient: patientId })
      .populate("doctor", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    const diagnosticReports = await DiagnosticReport.find({
      patient: patientId,
      state: "verified",
    })
      .populate("order", "testName testType status")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: "success",
      data: {
        consultations,
        diagnosticOrders,
        diagnosticReports,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch patient history" });
  }
};

// ==========================================
// 5. Get Doctor Profile
// ==========================================
export const getDoctorProfile = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?._id;
    const user = await User.findById(doctorId).select("-password");
    if (!user) throw new AppError("Doctor not found", 404);

    const profile = await ProfessionalProfile.findOne({ user: doctorId });

    res.status(200).json({
      status: "success",
      data: { user, profile },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to fetch profile",
    });
  }
};

// ==========================================
// 6. Update Doctor Profile
// ==========================================
export const updateDoctorProfile = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?._id;
    const {
      department,
      bio,
      specialization,
      degree,
      name,
      phone,
      experienceYears,
      licenseNumber,
    } = req.body;

    let user = await User.findById(doctorId);
    if (!user) throw new AppError("Doctor not found", 404);

    let profile = await ProfessionalProfile.findOne({ user: doctorId });
    if (!profile) {
      // If profile doesn't exist, create a stub one
      profile = new ProfessionalProfile({
        user: doctorId,
        requestedRole: user.role,
        degree: degree || "Unknown",
        specialization: specialization || "General",
        experienceYears: experienceYears || 0,
        licenseNumber: licenseNumber || "TBD",
      });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;

    if (department) profile.department = department;
    if (bio) profile.bio = bio;
    if (specialization) profile.specialization = specialization;
    if (degree) profile.degree = degree;
    if (experienceYears !== undefined)
      profile.experienceYears = Number(experienceYears);
    if (licenseNumber) profile.licenseNumber = licenseNumber;

    // Handle Image Upload if file exists
    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const uploadResponse = await imagekit.upload({
        file: fileBuffer,
        fileName: `doctor_avatar_${doctorId}_${Date.now()}`,
        folder: "/hms/avatars",
      });
      user.avatarUrl = uploadResponse.url;
      // clean up temp file
      fs.unlinkSync(req.file.path);
    }

    await user.save();
    await profile.save();

    res.status(200).json({
      status: "success",
      data: { user, profile },
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to update profile",
    });
  }
};

// ==========================================
// 7. Get Dashboard Stats
// ==========================================
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?._id;

    // Count today's appointments
    const today = getClinicDateKey();
    const appointmentsToday = await Appointment.countDocuments({
      doctor: doctorId,
      date: today,
    });

    // Count active patients (unique patients with appointments in last 30 days)
    const activePatients = await Appointment.distinct("patient", {
      doctor: doctorId,
    });

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const followUpsCount = await Consultation.countDocuments({
      doctor: doctorId,
      followUpDate: { $gte: todayDate },
    });

    const resultOrderIds = await DiagnosticOrder.find({
      doctor: doctorId,
      status: "REPORTED",
    }).distinct("_id");
    const resultsAwaiting = await DiagnosticReport.countDocuments({
      order: { $in: resultOrderIds },
      state: "pending sign",
    });

    const shift = await Schedule.findOne({
      user: doctorId,
      date: today,
      shiftType: { $in: ["REGULAR", "ON_CALL"] },
    }).sort({ startTime: 1 });
    let elapsedMinutes = 0;
    if (shift) {
      const toMinutes = (value: string) => {
        const [hours, minutes] = value.split(":").map(Number);
        return (hours || 0) * 60 + (minutes || 0);
      };
      const start = toMinutes(shift.startTime);
      const end = toMinutes(shift.endTime);
      const now = getClinicMinutesOfDay();
      const duration = end >= start ? end - start : 1440 - start + end;
      const adjustedNow = now < start ? now + 1440 : now;
      const elapsed = adjustedNow >= start ? adjustedNow - start : 0;
      elapsedMinutes = Math.max(0, Math.min(duration, elapsed));
    }

    res.status(200).json({
      status: "success",
      data: {
        appointmentsToday,
        activePatientsCount: activePatients.length,
        resultsAwaiting,
        timeOnShift: `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`,
        followUpsCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: "Failed to fetch stats" });
  }
};

// ==========================================
// 8. Get Assigned Patients (Inpatients / Rounds)
// ==========================================
export const getAssignedPatients = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?._id;
    const patientIds = await Appointment.distinct("patient", {
      doctor: doctorId,
    });
    const patients = await User.find({ _id: { $in: patientIds } })
      .select("name email phone avatarUrl")
      .lean();

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const followUpConsults = await Consultation.find({
      doctor: doctorId,
      followUpDate: { $gte: todayDate, $lt: tomorrowDate },
    })
      .populate("patient", "name email phone avatarUrl")
      .lean();

    const todayFollowUps = followUpConsults.map((c) => c.patient);

    res.status(200).json({
      status: "success",
      data: { patients, todayFollowUps },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch patients" });
  }
};

// ==========================================
// 9. Diagnostics & Results
// ==========================================
export const getDiagnosticResults = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?._id;
    const orderIds = await DiagnosticOrder.find({ doctor: doctorId }).distinct(
      "_id",
    );
    const results = await DiagnosticReport.find({
      order: { $in: orderIds },
      state: "verified",
    })
      .select("patient order state isCritical findings fileUrl createdAt")
      .populate("patient", "name")
      .populate("order", "testName testType status")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: "success",
      data: { results },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch results" });
  }
};

// ==========================================
// 10. Orders and Meds
// ==========================================
export const getOrdersAndMeds = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?._id;
    const orders = await DiagnosticOrder.find({ doctor: doctorId })
      .select("patient testName testType status priority createdAt")
      .populate("patient", "name")
      .sort({ createdAt: -1 })
      .lean();

    const consultations = await Consultation.find({
      doctor: doctorId,
      medicines: { $exists: true, $not: { $size: 0 } },
    })
      .select("patient status createdAt medicines")
      .populate("patient", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: "success",
      data: { orders, consultations },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch orders and meds" });
  }
};

// ==========================================
// 11. Clinical Notes
// ==========================================
export const getClinicalNotes = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?._id;
    const notes = await ClinicalNote.find({ doctor: doctorId })
      .populate("patient", "name")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ status: "success", data: { notes } });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to fetch notes" });
  }
};

export const createClinicalNote = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?._id;
    const { patientId, appointmentId, category, content, tags } = req.body;

    const note = await ClinicalNote.create({
      patient: patientId,
      doctor: doctorId,
      appointment: appointmentId,
      category,
      content,
      tags,
    });
    const io = getIO();
    if (io) io.emit("note_created", { note });
    res.status(201).json({ status: "success", data: { note } });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to create note" });
  }
};

// ==========================================
// 12. Handovers
// ==========================================
export const getHandovers = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?._id;
    // Get handovers where the doctor is either the sender or receiver
    const handovers = await Handover.find({
      $or: [{ fromDoctor: doctorId }, { toDoctor: doctorId }],
    })
      .populate("patient", "name")
      .populate("fromDoctor", "name")
      .populate("toDoctor", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ status: "success", data: { handovers } });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch handovers" });
  }
};

export const createHandover = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?._id;
    const {
      patientId,
      toDoctorId,
      department,
      acuity,
      background,
      assessment,
      tasks,
    } = req.body;

    const handover = await Handover.create({
      patient: patientId,
      fromDoctor: doctorId,
      toDoctor: toDoctorId,
      department,
      acuity,
      background,
      assessment,
      tasks,
    });
    const io = getIO();
    if (io) io.emit("handover_created", { handover });
    res.status(201).json({ status: "success", data: { handover } });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to create handover" });
  }
};

// ==========================================
// 13. Rota / Schedule
// ==========================================
export const getSchedule = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?._id;
    const schedule = await Schedule.find({ user: doctorId })
      .sort({ date: 1, startTime: 1 })
      .lean();
    const today = getClinicDateKey();
    const [availability, appointments] = await Promise.all([
      DoctorAvailability.findOne({ doctor: doctorId }).lean(),
      Appointment.find({
        doctor: doctorId,
        date: { $gte: today },
        status: { $ne: "CANCELLED" },
        $nor: [{ paymentMethod: "ONLINE", paymentStatus: "PENDING_ONLINE" }],
      })
        .populate("patient", "name")
        .sort({ date: 1, queueNumber: 1, timeSlot: 1 })
        .limit(100)
        .lean(),
    ]);
    res.status(200).json({
      status: "success",
      data: { schedule, availability, appointments },
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch schedule" });
  }
};
