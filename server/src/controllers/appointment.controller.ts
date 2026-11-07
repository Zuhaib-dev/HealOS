import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  PaymentMethod as ApptPaymentMethod,
  PaymentStatus as ApptPaymentStatus,
  User,
  UserRole,
  ProfessionalProfile,
  Invoice,
  InvoiceStatus,
  InvoicePaymentMethod,
  DoctorAvailability,
} from "../models/index.js";
import { z } from "zod";
import { getIO } from "../socket.js";
import {
  getClinicDateKey,
  getClinicMinutesOfDay,
} from "../utils/clinic-date.js";

const bookAppointmentSchema = z.object({
  doctorId: z.string().regex(/^[a-f\d]{24}$/i, "Choose a valid doctor"),
  // The server resolves the department from the approved doctor's profile.
  // Keep this optional for older clients that still send it.
  department: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters"),
  type: z
    .enum([
      AppointmentType.IN_PERSON,
      AppointmentType.TELECONSULT,
      AppointmentType.EMERGENCY,
    ])
    .default(AppointmentType.IN_PERSON),
  paymentMethod: z
    .enum([ApptPaymentMethod.ONLINE, ApptPaymentMethod.CASH])
    .default(ApptPaymentMethod.CASH),
});

const updateStatusSchema = z.object({
  status: z.enum([
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ]),
  notes: z.string().optional(),
});

// 1. Patient Books Appointment
export const bookAppointment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const patientId = req.user?._id;

    const parsed = bookAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          parsed.error.issues[0]?.message ||
          "Please check the booking details.",
        errors: parsed.error.format(),
      });
      return;
    }

    const { doctorId, date, reason, type, paymentMethod } = parsed.data;

    // Verify doctor exists
    const doctorObj = await User.findById(doctorId);
    if (!doctorObj || doctorObj.role !== UserRole.DOCTOR) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Selected physician not found or unavailable",
      });
      return;
    }
    const professionalProfile = await ProfessionalProfile.findOne({
      user: doctorId,
      requestedRole: UserRole.DOCTOR,
      status: "APPROVED",
    }).select("specialization");
    if (!professionalProfile) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "This doctor is not approved for patient bookings.",
      });
      return;
    }
    const department = professionalProfile.specialization;

    let appointment: any;
    try {
      const requestedDate = new Date(`${date}T00:00:00.000Z`);
      if (Number.isNaN(requestedDate.getTime()) || date < getClinicDateKey()) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Choose a valid future appointment date.",
        });
        return;
      }
      const availability = await DoctorAvailability.findOne({
        doctor: doctorId,
        active: true,
      });
      if (
        !availability ||
        !availability.weekdays.includes(requestedDate.getUTCDay())
      ) {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "This doctor is not available on that day.",
        });
        return;
      }
      const start = toMinutes(availability.startTime);
      const end = toMinutes(availability.endTime);
      const currentMinutes =
        date === getClinicDateKey() ? getClinicMinutesOfDay() : -1;
      const occupied = await Appointment.find({
        doctor: doctorId,
        date,
        status: { $ne: AppointmentStatus.CANCELLED },
      })
        .select("timeSlot queueNumber")
        .lean();
      if (occupied.length >= availability.maxPatientsPerDay) {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "All appointment slots for this day have been booked.",
        });
        return;
      }
      const occupiedSet = new Set(occupied.map((item) => item.timeSlot));
      let timeSlot = "";
      const totalSlots = Math.floor(
        (end - start) / availability.slotDurationMinutes,
      );
      const effectiveCapacity = Math.min(
        availability.maxPatientsPerDay,
        totalSlots,
      );
      if (occupied.length >= effectiveCapacity) {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "All appointment slots for this day have been booked.",
        });
        return;
      }
      const previousQueueNumbers = await Appointment.find({
        doctor: doctorId,
        date,
        queueNumber: { $exists: true },
      })
        .select("queueNumber")
        .lean();
      const queueNumber =
        previousQueueNumbers.reduce(
          (highest, item) => Math.max(highest, item.queueNumber || 0),
          0,
        ) + 1;
      for (
        let minute = start;
        minute + availability.slotDurationMinutes <= end;
        minute += availability.slotDurationMinutes
      ) {
        const candidate = formatTime(minute);
        if (minute <= currentMinutes) continue;
        if (!occupiedSet.has(candidate)) {
          timeSlot = candidate;
          break;
        }
      }
      if (!timeSlot) {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: "No appointment slots remain for this day.",
        });
        return;
      }

      const paymentStatus =
        paymentMethod === ApptPaymentMethod.ONLINE
          ? ApptPaymentStatus.PENDING_ONLINE
          : ApptPaymentStatus.PENDING_CASH;

      const apptCreated = await Appointment.create({
        patient: patientId,
        doctor: doctorId,
        department,
        date,
        timeSlot,
        queueNumber,
        reason,
        type,
        status: AppointmentStatus.PENDING,
        paymentMethod,
        paymentStatus,
        amount: availability.consultationFee,
        advanceAmount: availability.advanceFee,
        arrivalTime: formatTime(Math.max(0, toMinutes(timeSlot) - 10)),
        slotEndTime: formatTime(
          toMinutes(timeSlot) + availability.slotDurationMinutes,
        ),
      });
      appointment = apptCreated;

      // Generate Invoice
      await Invoice.create({
        patient: patientId,
        issuedBy: patientId, // Self-booked
        appointment: appointment._id,
        items: [
          {
            description: "OPD Consultation Fee",
            amount: availability.consultationFee,
          },
        ],
        totalAmount: availability.consultationFee,
        status: InvoiceStatus.PENDING,
        paymentMethod:
          paymentMethod === ApptPaymentMethod.ONLINE
            ? InvoicePaymentMethod.CARD
            : undefined,
        payer: "self",
        paidAt: undefined,
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          message:
            "This doctor is already booked for the selected time slot. Please select another slot.",
        });
        return;
      }
      throw error;
    }

    const populated = await Appointment.findById(appointment._id)
      .populate("doctor", "name email avatarUrl phone")
      .populate("patient", "name email phone avatarUrl");

    const io = getIO();
    if (io && paymentMethod !== ApptPaymentMethod.ONLINE) {
      io.emit("appointment_created", {
        appointmentId: appointment._id,
        doctorId,
      });
    } else if (io) {
      io.emit("appointment_slot_reserved", { doctorId, date });
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

const toMinutes = (value: string) => {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return h * 60 + m;
};
const formatTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const getDoctorAvailability = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { doctorId, date } = req.query as { doctorId?: string; date?: string };
  if (!doctorId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res
      .status(400)
      .json({ success: false, message: "doctorId and date are required" });
    return;
  }
  const day = new Date(`${date}T00:00:00.000Z`);
  const availability = await DoctorAvailability.findOne({
    doctor: doctorId,
    active: true,
  }).lean();
  if (
    !availability ||
    !availability.weekdays.includes(day.getUTCDay()) ||
    date < getClinicDateKey()
  ) {
    res.json({ success: true, available: false, slotsRemaining: 0 });
    return;
  }
  const booked = await Appointment.find({
    doctor: doctorId,
    date,
    status: { $ne: AppointmentStatus.CANCELLED },
  })
    .select("timeSlot")
    .lean();
  const taken = new Set(booked.map((item) => item.timeSlot));
  const total = Math.min(
    availability.maxPatientsPerDay,
    Math.floor(
      (toMinutes(availability.endTime) - toMinutes(availability.startTime)) /
        availability.slotDurationMinutes,
    ),
  );
  const currentMinutes =
    date === getClinicDateKey() ? getClinicMinutesOfDay() : -1;
  const availableSlots: Array<{
    start: string;
    end: string;
    arrivalTime: string;
  }> = [];
  for (
    let minute = toMinutes(availability.startTime);
    minute + availability.slotDurationMinutes <=
    toMinutes(availability.endTime);
    minute += availability.slotDurationMinutes
  ) {
    if (minute <= currentMinutes) continue;
    const candidate = formatTime(minute);
    if (!taken.has(candidate)) {
      availableSlots.push({
        start: candidate,
        end: formatTime(minute + availability.slotDurationMinutes),
        arrivalTime: formatTime(Math.max(0, minute - 10)),
      });
    }
  }
  const dailyCapacityRemaining = Math.max(
    0,
    Math.min(total, availability.maxPatientsPerDay) - booked.length,
  );
  const slotsRemaining = Math.min(
    availableSlots.length,
    dailyCapacityRemaining,
  );
  res.json({
    success: true,
    available: availableSlots.length > 0 && slotsRemaining > 0,
    nextSlot: availableSlots[0]?.start || null,
    availableSlots,
    dailyCapacity: total,
    bookedCount: booked.length,
    slotsRemaining,
    consultationFee: availability.consultationFee,
    advanceFee: availability.advanceFee,
    slotDurationMinutes: availability.slotDurationMinutes,
  });
};

// 2. Fetch Patient's Appointments
export const getPatientAppointments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const patientId = req.user?._id;

    const appointments = await Appointment.find({
      patient: patientId,
      $nor: [
        {
          paymentMethod: ApptPaymentMethod.ONLINE,
          paymentStatus: ApptPaymentStatus.PENDING_ONLINE,
        },
      ],
    })
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
export const getDoctorAppointments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const doctorId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const period = typeof req.query.period === "string" ? req.query.period : "";
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const department =
      typeof req.query.department === "string"
        ? req.query.department.trim()
        : "";
    const query: Record<string, any> = { doctor: doctorId };
    query.$nor = [
      {
        paymentMethod: ApptPaymentMethod.ONLINE,
        paymentStatus: ApptPaymentStatus.PENDING_ONLINE,
      },
    ];
    if (Object.values(AppointmentStatus).includes(status as AppointmentStatus))
      query.status = status;
    const today = new Date().toISOString().slice(0, 10);
    if (period === "UPCOMING") query.date = { $gte: today };
    if (period === "PAST") query.date = { $lt: today };
    if (department) query.department = department;
    if (search) {
      const safeSearch = search.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&");
      const matchingPatients = await User.find({
        role: UserRole.PATIENT,
        $or: [
          { name: { $regex: safeSearch, $options: "i" } },
          { email: { $regex: safeSearch, $options: "i" } },
          { phone: { $regex: safeSearch, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();
      query.$or = [
        { reason: { $regex: safeSearch, $options: "i" } },
        { department: { $regex: safeSearch, $options: "i" } },
        { patient: { $in: matchingPatients.map((patient) => patient._id) } },
      ];
    }
    const totalCount = await Appointment.countDocuments(query);

    const appointments = await Appointment.find(query)
      .populate("patient", "name email phone avatarUrl")
      .sort({ createdAt: -1, _id: -1 })
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
export const updateAppointmentStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
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
    if (
      req.user?.role !== UserRole.ADMIN &&
      req.user?.role !== UserRole.RECEPTIONIST
    ) {
      if (appointment.doctor.toString() !== req.user?._id?.toString()) {
        res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message:
            "You do not have permission to update this appointment's status.",
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
      io.emit("appointment_updated", {
        appointmentId: id,
        status: parsed.data.status,
      });
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
export const getAvailableDoctors = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const schedules = await DoctorAvailability.find({
      active: true,
      weekdays: { $exists: true, $ne: [] },
    })
      .select("doctor consultationFee")
      .exec();
    const scheduledDoctors = schedules.map((schedule) => schedule.doctor);
    const doctorProfiles = await ProfessionalProfile.find({
      user: { $in: scheduledDoctors },
      requestedRole: UserRole.DOCTOR,
      status: "APPROVED",
    }).select("user specialization degree experienceYears");
    const doctors = await User.find({
      _id: { $in: doctorProfiles.map((profile) => profile.user) },
      role: UserRole.DOCTOR,
    }).select("name email phone avatarUrl role");

    const doctorMap = new Map();
    doctorProfiles.forEach((p) => doctorMap.set(p.user.toString(), p));
    const scheduleMap = new Map(
      schedules.map((schedule) => [schedule.doctor.toString(), schedule]),
    );

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
        experienceYears: prof?.experienceYears || 0,
        consultationFee: scheduleMap.get(doc._id.toString())?.consultationFee,
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
export const cancelAppointmentByPatient = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const patientId = req.user?._id;

    const appointment = await Appointment.findOne({
      _id: id,
      patient: patientId,
    });
    if (!appointment) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Appointment record not found or unauthorized",
      });
      return;
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: "Appointment is already cancelled" });
      return;
    }

    if (appointment.paymentMethod === ApptPaymentMethod.CASH) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Cash appointments cannot be self-cancelled online. Please contact the reception desk.",
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
          message:
            "The 30-minute free cancellation window has passed. Please contact the reception desk.",
        });
        return;
      }
    }

    appointment.status = AppointmentStatus.CANCELLED;
    if (appointment.paymentMethod === ApptPaymentMethod.ONLINE) {
      appointment.paymentStatus =
        (appointment.paidAmount || 0) > 0
          ? ApptPaymentStatus.REFUNDED
          : ApptPaymentStatus.PENDING_ONLINE;
    }
    await appointment.save();
    getIO()?.emit("appointment_slot_released", {
      doctorId: appointment.doctor,
      date: appointment.date,
    });

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
