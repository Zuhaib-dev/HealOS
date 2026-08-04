import { Request, Response } from "express";
import {
  Appointment,
  Consultation,
  DiagnosticOrder,
  DiagnosticReport,
  ProfessionalProfile,
  User,
} from "../models/index.js";
import { AppError } from "../middleware/error-handler.js";
import ImageKit from "imagekit";
import fs from "fs";

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_key",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_key",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/your_endpoint"
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
      .populate("patient", "firstName lastName email avatar role")
      .sort({ date: 1, timeSlot: 1 });

    res.status(200).json({
      status: "success",
      data: { appointments },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to fetch appointments" });
  }
};

// ==========================================
// 2. Create or Update Consultation (Prescription)
// ==========================================
export const saveConsultation = async (req: Request, res: Response) => {
  try {
    const doctorId = req.user?.id;
    const {
      patientId,
      appointmentId,
      chiefComplaint,
      diagnosis,
      advice,
      medicines,
      diagnosticOrders, // array of { testType, testName, clinicalNotes }
      status, // DRAFT or COMPLETED
    } = req.body;

    if (!patientId) {
      throw new AppError("Patient ID is required", 400);
    }

    // Check if consultation for this appointment already exists
    let consultation;
    if (appointmentId) {
      consultation = await Consultation.findOne({ appointment: appointmentId });
    }

    if (consultation) {
      // Update existing
      consultation.chiefComplaint = chiefComplaint;
      consultation.diagnosis = diagnosis;
      consultation.advice = advice;
      consultation.medicines = medicines;
      consultation.status = status;
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
        medicines,
        status,
      });
    }

    // If completed, update appointment status
    if (status === "COMPLETED" && appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, { status: "COMPLETED" });
    }

    // Process diagnosticOrders
    if (diagnosticOrders && Array.isArray(diagnosticOrders)) {
      const ordersToCreate = diagnosticOrders.map(order => ({
        patient: patientId,
        doctor: doctorId,
        consultation: consultation._id,
        testType: order.testType,
        testName: order.testName,
        priority: order.priority || "ROUTINE",
        clinicalNotes: order.clinicalNotes || chiefComplaint,
      }));
      await DiagnosticOrder.insertMany(ordersToCreate);
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
      throw new AppError("Patient ID, testType, and testName are required", 400);
    }

    const order = await DiagnosticOrder.create({
      patient: patientId,
      doctor: doctorId,
      consultation: consultationId,
      testType,
      testName,
      priority,
      clinicalNotes,
    });

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
    const { id: patientId } = req.params;

    const consultations = await Consultation.find({ patient: patientId })
      .populate("doctor", "firstName lastName")
      .sort({ createdAt: -1 });

    const diagnosticOrders = await DiagnosticOrder.find({ patient: patientId })
      .populate("doctor", "firstName lastName")
      .sort({ createdAt: -1 });

    const diagnosticReports = await DiagnosticReport.find({ patient: patientId })
      .populate("radiologist", "firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      data: {
        consultations,
        diagnosticOrders,
        diagnosticReports,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to fetch patient history" });
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
    const { department, bio, specialization, degree, name, phone, experienceYears, licenseNumber } = req.body;

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
    if (experienceYears !== undefined) profile.experienceYears = Number(experienceYears);
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
      await user.save();
      // clean up temp file
      fs.unlinkSync(req.file.path);
    }

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
