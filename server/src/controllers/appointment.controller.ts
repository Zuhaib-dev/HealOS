import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Appointment, AppointmentStatus, AppointmentType, PaymentMethod as ApptPaymentMethod, PaymentStatus as ApptPaymentStatus, User, UserRole, ProfessionalProfile, Invoice, InvoiceStatus, InvoicePaymentMethod } from "../models/index.js";
import { z } from "zod";
import { getIO } from "../socket.js";

const bookAppointmentSchema = z.object({
  doctorId: z.string().min(1, "Doctor selection is required"),
  department: z.string().min(1, "Department is required"),
  date: z.string().min(1, "Appointment date is required"),
  timeSlot: z.string().min(1, "Time slot is required"),
  reason: z.string().min(3, "Reason for visit is required"),
  type: z.enum([AppointmentType.IN_PERSON, AppointmentType.TELECONSULT, AppointmentType.EMERGENCY]).default(AppointmentType.IN_PERSON),
  paymentMethod: z.enum([ApptPaymentMethod.ONLINE, ApptPaymentMethod.CASH]).default(ApptPaymentMethod.CASH),
});

const updateStatusSchema = z.object({
  status: z.enum([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]),
  notes: z.string().optional(),
});

// 1. Patient Books Appointment
export const bookAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = req.user?._id;

    const parsed = bookAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid booking data",
        errors: parsed.error.format(),
      });
      return;
    }

    const { doctorId, department, date, timeSlot, reason, type, paymentMethod } = parsed.data;

    // Verify doctor exists
    const doctorObj = await User.findById(doctorId);
    if (!doctorObj || (doctorObj.role !== UserRole.DOCTOR && doctorObj.role !== UserRole.RADIOLOGIST && doctorObj.role !== UserRole.ADMIN)) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Selected physician not found or unavailable",
      });
      return;
    }

    // Check if slot is already booked for this doctor
    const existingBooking = await Appointment.findOne({
      doctor: doctorId,
      date,
      timeSlot,
      status: { $ne: AppointmentStatus.CANCELLED },
    });

    if (existingBooking) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "This doctor is already booked for the selected time slot. Please select another slot.",
      });
      return;
    }

    const paymentStatus = paymentMethod === ApptPaymentMethod.ONLINE ? ApptPaymentStatus.PENDING_ONLINE : ApptPaymentStatus.PENDING_CASH;

    let appointment;
    try {
      appointment = await Appointment.create({
        patient: patientId,
        doctor: doctorId,
        department,
        date,
        timeSlot,
        reason,
        type,
        status: AppointmentStatus.PENDING,
        paymentMethod,
        paymentStatus,
        amount: 400,
      });
    } catch (createError: any) {
      if (createError.code === 11000) {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "This doctor is already booked for the selected time slot. Please select another slot.",
        });
        return;
      }
      throw createError;
    }

    // Generate Invoice
    await Invoice.create({
      patient: patientId,
      issuedBy: patientId, // Self-booked
      appointment: appointment._id,
      items: [{ description: "OPD Consultation Fee", amount: 400 }],
      totalAmount: 400,
      status: InvoiceStatus.PENDING,
      paymentMethod: paymentMethod === ApptPaymentMethod.ONLINE ? InvoicePaymentMethod.CARD : undefined,
      payer: "self",
      paidAt: undefined,
    });

    const populated = await Appointment.findById(appointment._id)
      .populate("doctor", "name email avatarUrl phone")
      .populate("patient", "name email phone avatarUrl");

    const io = getIO();
    if (io) {
      io.emit("appointment_created", { appointmentId: appointment._id, doctorId });
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Appointment booked successfully!",
      appointment: populated,
    });
  } catch (error) {
    console.error("Error in bookAppointment:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while booking appointment",
    });
  }
};

// 2. Fetch Patient's Appointments
export const getPatientAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientId = req.user?._id;

    const appointments = await Appointment.find({ patient: patientId })
      .populate("doctor", "name email avatarUrl phone role")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error("Error in getPatientAppointments:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while fetching appointments",
    });
  }
};

// 3. Fetch Doctor's Assigned Appointments (with Pagination and Sort)
export const getDoctorAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctorId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const totalCount = await Appointment.countDocuments({ doctor: doctorId });

    const appointments = await Appointment.find({ doctor: doctorId })
      .populate("patient", "name email phone avatarUrl")
      .sort({ date: -1, timeSlot: -1 })
      .skip(skip)
      .limit(limit);

    res.status(StatusCodes.OK).json({
      success: true,
      count: appointments.length,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      appointments,
    });
  } catch (error) {
    console.error("Error in getDoctorAppointments:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while fetching doctor appointments",
    });
  }
};

// 4. Update Appointment Status & Add Notes (Doctor / Admin / Patient Cancel)
export const updateAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = updateStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid status update data",
        errors: parsed.error.format(),
      });
      return;
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Appointment record not found",
      });
      return;
    }

    // IDOR Check
    if (req.user?.role !== UserRole.ADMIN && req.user?.role !== UserRole.RECEPTIONIST) {
      if (appointment.doctor.toString() !== req.user?._id?.toString()) {
        res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "You do not have permission to update this appointment's status.",
        });
        return;
      }
    }

    appointment.status = parsed.data.status;
    if (parsed.data.notes) {
      appointment.notes = parsed.data.notes;
    }

    await appointment.save();

    const updated = await Appointment.findById(id)
      .populate("doctor", "name email avatarUrl")
      .populate("patient", "name email avatarUrl");

    const io = getIO();
    if (io) {
      io.emit("appointment_updated", { appointmentId: id, status: parsed.data.status });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: `Appointment status updated to ${parsed.data.status}`,
      appointment: updated,
    });
  } catch (error) {
    console.error("Error in updateAppointmentStatus:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while updating appointment status",
    });
  }
};

// 5. Get List of Available Doctors for Booking
export const getAvailableDoctors = async (_req: Request, res: Response): Promise<void> => {
  try {
    const doctors = await User.find({
      role: { $in: [UserRole.DOCTOR, UserRole.RADIOLOGIST, UserRole.ADMIN] },
    }).select("name email phone avatarUrl role");

    // Enhance with professional specialization if available
    const doctorProfiles = await ProfessionalProfile.find({
      user: { $in: doctors.map((d) => d._id) },
    });

    const doctorMap = new Map();
    doctorProfiles.forEach((p) => doctorMap.set(p.user.toString(), p));

    const result = doctors.map((doc) => {
      const prof = doctorMap.get(doc._id.toString());
      return {
        _id: doc._id,
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        avatarUrl: doc.avatarUrl,
        role: doc.role,
        specialization: prof?.specialization || "General Medicine",
        degree: prof?.degree || "MD / MBBS",
      };
    });

    res.status(StatusCodes.OK).json({
      success: true,
      doctors: result,
    });
  } catch (error) {
    console.error("Error in getAvailableDoctors:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while fetching available doctors",
    });
  }
};

// 6. Patient Cancels Appointment
export const cancelAppointmentByPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const patientId = req.user?._id;

    const appointment = await Appointment.findOne({ _id: id, patient: patientId });
    if (!appointment) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Appointment record not found or unauthorized",
      });
      return;
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "Appointment is already cancelled" });
      return;
    }

    if (appointment.paymentMethod === ApptPaymentMethod.CASH) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Cash appointments cannot be self-cancelled online. Please contact the reception desk.",
      });
      return;
    }

    // Check 30-min window for online payments
    if (appointment.paymentMethod === ApptPaymentMethod.ONLINE) {
      const now = new Date();
      const bookedAt = appointment.bookedAt;
      const diffMs = now.getTime() - new Date(bookedAt).getTime();
      const diffMins = diffMs / 60000;

      if (diffMins > 30) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "The 30-minute free cancellation window has passed. Please contact the reception desk.",
        });
        return;
      }
    }

    appointment.status = AppointmentStatus.CANCELLED;
    if (appointment.paymentMethod === ApptPaymentMethod.ONLINE) {
      appointment.paymentStatus = ApptPaymentStatus.REFUNDED;
    }
    await appointment.save();

    // Update related invoice
    const invoice = await Invoice.findOne({ appointment: id });
    if (invoice) {
      invoice.status = InvoiceStatus.CANCELLED;
      await invoice.save();
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Appointment cancelled successfully. Refund initiated.",
    });
  } catch (error) {
    console.error("Error in cancelAppointmentByPatient:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while cancelling appointment",
    });
  }
};
