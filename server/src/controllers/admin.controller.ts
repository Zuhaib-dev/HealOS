import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { User, UserRole } from "../models/user.model.js";
import { PatientProfile } from "../models/patient-profile.model.js";
import { ProfessionalProfile } from "../models/professional-profile.model.js";
import { Appointment } from "../models/appointment.model.js";
import { Invoice } from "../models/invoice.model.js";
import { Ward } from "../models/ward.model.js";
import { Inventory } from "../models/inventory.model.js";
import { AuditLog } from "../models/audit-log.model.js";
import { emitAdminDataChanged, emitUserRoleUpdated, getIO } from "../socket.js";
import { logAudit } from "../utils/audit.js";
import { z } from "zod";
import { DoctorAvailability } from "../models/doctor-availability.model.js";
import { getClinicDateKey } from "../utils/clinic-date.js";

const wardSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  capacity: z.number().int().nonnegative(),
  currentOccupancy: z.number().int().nonnegative().optional(),
  department: z.string().optional(),
});

const inventorySchema = z.object({
  itemName: z.string().min(1),
  itemCode: z.string().min(1),
  category: z.string().optional(),
  currentStock: z.number().int().nonnegative(),
  reorderThreshold: z.number().int().nonnegative().optional(),
  unit: z.string().min(1),
  unitPrice: z.number().nonnegative().default(0),
});

const getPagination = (req: Request) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const paginationMeta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  pages: Math.max(Math.ceil(total / limit), 1),
});

/**
 * GET /api/v1/admin/users
 * Returns list of all system users
 */
export const getAllUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { page, limit, skip } = getPagination(req);
    const queryText = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const role =
      typeof req.query.role === "string" ? req.query.role.trim() : "";
    // Patient accounts are managed in the patient registry, not the staff role editor.
    const query: Record<string, any> = { role: { $ne: UserRole.PATIENT } };

    if (queryText) {
      const sanitizedRegex = queryText.replace(
        /[-[\]{}()*+?.,\\^$|#]/g,
        "\\$&",
      );
      const flexibleRolePattern = sanitizedRegex.replace(/\s+/g, "[_\\s]?");
      query.$or = [
        { name: { $regex: sanitizedRegex, $options: "i" } },
        { email: { $regex: sanitizedRegex, $options: "i" } },
        { phone: { $regex: sanitizedRegex, $options: "i" } },
        { role: { $regex: flexibleRolePattern, $options: "i" } },
      ];
    }

    if (role && Object.values(UserRole).includes(role as UserRole)) {
      query.role = role;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      users,
      count: total,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching user list",
    });
  }
};

/**
 * GET /api/v1/admin/patients
 * Returns list of all patient profiles
 */
export const getAllPatients = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { page, limit, skip } = getPagination(req);
    const queryText = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const sanitizedRegex = queryText
      ? queryText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
      : "";
    const matchingProfileUserIds = sanitizedRegex
      ? await PatientProfile.distinct("user", {
          $or: [
            { emergencyContactName: { $regex: sanitizedRegex, $options: "i" } },
            { emergencyPhone: { $regex: sanitizedRegex, $options: "i" } },
          ],
        })
      : [];
    const userQuery: Record<string, any> = { role: UserRole.PATIENT };
    if (sanitizedRegex) {
      userQuery.$or = [
        { name: { $regex: sanitizedRegex, $options: "i" } },
        { email: { $regex: sanitizedRegex, $options: "i" } },
        { phone: { $regex: sanitizedRegex, $options: "i" } },
        { _id: { $in: matchingProfileUserIds } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(userQuery)
        .select("name email phone avatarUrl role createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(userQuery),
    ]);
    const profiles = await PatientProfile.find({
      user: { $in: users.map((user) => user._id) },
    }).lean();
    const profilesByUser = new Map(
      profiles.map((profile) => [profile.user.toString(), profile]),
    );
    const patients = users.map((user) => {
      const profile = profilesByUser.get(user._id.toString());
      return {
        _id: profile?._id || user._id,
        user,
        gender: profile?.gender,
        bloodGroup: profile?.bloodGroup,
        emergencyContactName: profile?.emergencyContactName,
        emergencyPhone: profile?.emergencyPhone,
        isComplete: profile?.isComplete || false,
        createdAt: profile?.createdAt || user.createdAt,
      };
    });

    res.status(StatusCodes.OK).json({
      success: true,
      patients,
      count: total,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error("Error in getAllPatients:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching patient list",
    });
  }
};

/**
 * GET /api/v1/admin/stats
 * Returns overall facility statistics
 */
export const getFacilityStats = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const [
      totalUsers,
      totalPatients,
      totalClinicians,
      totalAppointments,
      pendingApprovals,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: UserRole.PATIENT }),
      ProfessionalProfile.countDocuments({ status: "APPROVED" }),
      Appointment.countDocuments(),
      ProfessionalProfile.countDocuments({ status: "PENDING" }),
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      stats: {
        totalUsers,
        totalPatients,
        totalClinicians,
        totalAppointments,
        pendingApprovals,
      },
    });
  } catch (error) {
    console.error("Error in getFacilityStats:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching facility stats",
    });
  }
};

export const getAdminOverview = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const [
      totalUsers,
      totalPatients,
      totalClinicians,
      totalAppointments,
      pendingApprovals,
      wards,
      staffDepartments,
      overdueInvoices,
      lowStock,
      criticalAudit,
      revenueData,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: UserRole.PATIENT }),
      ProfessionalProfile.countDocuments({ status: "APPROVED" }),
      Appointment.countDocuments(),
      ProfessionalProfile.countDocuments({ status: "PENDING" }),
      Ward.find()
        .select("name code capacity currentOccupancy department")
        .lean(),
      ProfessionalProfile.aggregate([
        {
          $group: {
            _id: { $ifNull: ["$department", "General"] },
            total: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] },
            },
          },
        },
        { $project: { _id: 0, label: "$_id", total: 1, approved: 1 } },
        { $sort: { label: 1 } },
      ]),
      Invoice.countDocuments({ status: { $in: ["OVERDUE", "FAILED"] } }),
      Inventory.countDocuments({
        $expr: { $lt: ["$currentStock", "$reorderThreshold"] },
      }),
      AuditLog.countDocuments({ level: "crit" }),
      Invoice.aggregate([
        {
          $addFields: {
            normalizedPayments: {
              $cond: [
                {
                  $gt: [{ $size: { $ifNull: ["$paymentHistory", []] } }, 0],
                },
                {
                  $map: {
                    input: "$paymentHistory",
                    as: "payment",
                    in: {
                      amount: "$$payment.amount",
                      paidAt: "$$payment.paidAt",
                    },
                  },
                },
                {
                  $cond: [
                    { $eq: ["$status", "PAID"] },
                    [
                      {
                        amount: {
                          $cond: [
                            { $gt: [{ $ifNull: ["$paidAmount", 0] }, 0] },
                            "$paidAmount",
                            {
                              $max: [
                                0,
                                {
                                  $subtract: [
                                    "$totalAmount",
                                    { $ifNull: ["$insuranceCoverage", 0] },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        paidAt: { $ifNull: ["$paidAt", "$createdAt"] },
                      },
                    ],
                    [],
                  ],
                },
              ],
            },
          },
        },
        { $unwind: "$normalizedPayments" },
        {
          $group: {
            _id: {
              $dateToString: {
                date: "$normalizedPayments.paidAt",
                format: "%Y-%m-%d",
                timezone: "Asia/Kolkata",
              },
            },
            total: { $sum: "$normalizedPayments.amount" },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, dateKey: "$_id", total: 1 } },
      ]),
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      overview: {
        stats: {
          totalUsers,
          totalPatients,
          totalClinicians,
          totalAppointments,
          pendingApprovals,
        },
        wards,
        staffDepartments,
        overdueInvoices,
        lowStock,
        criticalAudit,
        revenueData,
      },
    });
  } catch (error) {
    console.error("Error in getAdminOverview:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching admin overview",
    });
  }
};

/**
 * PATCH /api/v1/admin/users/:id/role
 * Updates a user's role directly (e.g. promoting to RADIOLOGIST or DOCTOR)
 */
export const updateUserRole = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(UserRole).includes(role)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid user role specified",
      });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    user.role = role;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Emit socket event for real-time role promotion in client browser
    emitUserRoleUpdated(user._id.toString(), role);
    emitAdminDataChanged(
      ["users", "staff", "roles", "audit"],
      "admin_role_update",
    );

    // Write immutable audit log
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(
      actor,
      `Elevated user role to ${role}`,
      `user:${user._id.toString().slice(-6)}`,
      "warn",
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: `User ${user.name}'s role updated to ${role} in real-time`,
      user,
    });
  } catch (error) {
    console.error("Error in updateUserRole:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while updating user role",
    });
  }
};

/**
 * GET /api/v1/admin/staff
 * Returns list of all professional profiles (staff)
 */
export const getStaff = async (_req: Request, res: Response): Promise<void> => {
  try {
    const staff = await ProfessionalProfile.find()
      .populate("user", "name email phone role avatarUrl")
      .sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({
      success: true,
      staff,
      count: staff.length,
    });
  } catch (error) {
    console.error("Error in getStaff:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching staff list",
    });
  }
};

/**
 * GET /api/v1/admin/roles
 * Returns role seat counts and static permission scopes for visible roles
 */
export const getRoles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const counts = await User.aggregate([
      { $group: { _id: "$role", seats: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const seatMap = counts.reduce<Record<string, number>>((acc, row) => {
      acc[row._id] = row.seats;
      return acc;
    }, {});

    const scopesByRole: Record<
      string,
      Record<string, "full" | "read" | "none">
    > = {
      ADMIN: {
        Records: "full",
        Orders: "full",
        Prescribe: "none",
        Billing: "full",
        Admin: "full",
        Audit: "full",
      },
      DOCTOR: {
        Records: "full",
        Orders: "full",
        Prescribe: "full",
        Billing: "read",
        Admin: "none",
        Audit: "none",
      },
      RADIOLOGIST: {
        Records: "read",
        Orders: "read",
        Prescribe: "none",
        Billing: "none",
        Admin: "none",
        Audit: "none",
      },
      NURSE: {
        Records: "read",
        Orders: "read",
        Prescribe: "none",
        Billing: "none",
        Admin: "none",
        Audit: "none",
      },
      PATIENT: {
        Records: "read",
        Orders: "none",
        Prescribe: "none",
        Billing: "read",
        Admin: "none",
        Audit: "none",
      },
      RECEPTIONIST: {
        Records: "read",
        Orders: "read",
        Prescribe: "none",
        Billing: "read",
        Admin: "none",
        Audit: "none",
      },
      PHARMACIST: {
        Records: "read",
        Orders: "read",
        Prescribe: "none",
        Billing: "none",
        Admin: "none",
        Audit: "none",
      },
      EMERGENCY_DOCTOR: {
        Records: "full",
        Orders: "full",
        Prescribe: "full",
        Billing: "none",
        Admin: "none",
        Audit: "none",
      },
      LAB_TECHNICIAN: {
        Records: "read",
        Orders: "read",
        Prescribe: "none",
        Billing: "none",
        Admin: "none",
        Audit: "none",
      },
      USER: {
        Records: "none",
        Orders: "none",
        Prescribe: "none",
        Billing: "none",
        Admin: "none",
        Audit: "none",
      },
    };

    const roles = Object.values(UserRole).map((role) => ({
      role,
      seats: seatMap[role] || 0,
      scopes: scopesByRole[role],
    }));

    res.status(StatusCodes.OK).json({
      success: true,
      permissionScopes: [
        "Records",
        "Orders",
        "Prescribe",
        "Billing",
        "Admin",
        "Audit",
      ],
      roles,
    });
  } catch (error) {
    console.error("Error in getRoles:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error fetching roles" });
  }
};

/**
 * GET /api/v1/admin/schedule
 * Returns today's appointments and schedules
 */
export const getSchedule = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const dateStr =
      typeof req.query.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : getClinicDateKey();

    const appointments = await Appointment.find({
      date: dateStr,
    })
      .populate("patient", "user")
      .populate("doctor", "user department")
      .sort({ timeSlot: 1 });

    const { Schedule } = await import("../models/schedule.model.js");
    const schedules = await Schedule.find({ date: dateStr })
      .populate("user", "name email phone avatarUrl role")
      .sort({ startTime: 1 });

    res.status(StatusCodes.OK).json({
      success: true,
      appointments,
      schedules,
    });
  } catch (error) {
    console.error("Error in getSchedule:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching schedule",
    });
  }
};

const scheduleSchema = z.object({
  user: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  shiftType: z.enum(["REGULAR", "ON_CALL", "LEAVE"]).optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
});

const doctorAvailabilitySchema = z
  .object({
    weekdays: z.array(z.number().int().min(0).max(6)).min(1),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    slotDurationMinutes: z.number().int().min(5).max(240),
    maxPatientsPerDay: z.number().int().min(1).max(100),
    consultationFee: z.number().nonnegative(),
    advanceFee: z.number().int().min(1),
    active: z.boolean().default(true),
  })
  .refine((data) => data.startTime < data.endTime, {
    path: ["endTime"],
    message: "End time must be after start time",
  })
  .refine((data) => data.advanceFee <= data.consultationFee, {
    path: ["advanceFee"],
    message: "Advance must not exceed the total fee",
  });

export const getDoctorAvailabilities = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const availability = await DoctorAvailability.find()
    .populate("doctor", "name role")
    .sort({ updatedAt: -1 });
  res.json({ success: true, availability });
};

export const saveDoctorAvailability = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const parsed = doctorAvailabilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, errors: parsed.error.format() });
    return;
  }
  const doctor = await User.findById(req.params.doctorId);
  if (
    !doctor ||
    ![UserRole.DOCTOR, UserRole.RADIOLOGIST].includes(doctor.role)
  ) {
    res.status(404).json({ success: false, message: "Doctor not found" });
    return;
  }
  const availability = await DoctorAvailability.findOneAndUpdate(
    { doctor: doctor._id },
    { ...parsed.data, doctor: doctor._id },
    { upsert: true, new: true, runValidators: true },
  );
  getIO()
    ?.to(`user:${doctor._id}`)
    .emit("doctor_availability_updated", { doctorId: doctor._id });
  emitAdminDataChanged(["schedule"], "doctor_availability_updated");
  res.json({ success: true, availability });
};

export const createSchedule = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, errors: parsed.error.format() });
      return;
    }
    const { Schedule } = await import("../models/schedule.model.js");
    const schedule = await Schedule.create(parsed.data);
    emitAdminDataChanged(["schedule"], "schedule_created");
    res.status(StatusCodes.CREATED).json({ success: true, schedule });
  } catch (error) {
    console.error("Error creating schedule:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error creating schedule" });
  }
};

export const updateSchedule = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const parsed = scheduleSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, errors: parsed.error.format() });
      return;
    }
    const { Schedule } = await import("../models/schedule.model.js");
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      parsed.data,
      { new: true },
    );
    if (!schedule) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Schedule not found" });
      return;
    }
    emitAdminDataChanged(["schedule"], "schedule_updated");
    res.status(StatusCodes.OK).json({ success: true, schedule });
  } catch (error) {
    console.error("Error updating schedule:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error updating schedule" });
  }
};

export const deleteSchedule = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { Schedule } = await import("../models/schedule.model.js");
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Schedule not found" });
      return;
    }
    emitAdminDataChanged(["schedule"], "schedule_deleted");
    res
      .status(StatusCodes.OK)
      .json({ success: true, message: "Schedule deleted" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error deleting schedule" });
  }
};

/**
 * GET /api/v1/admin/invoices
 * Returns all invoices
 */
export const getInvoices = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Dynamic import to avoid undefined if Invoice model is not imported at top
    const { Invoice } = await import("../models/invoice.model.js");
    const invoices = await Invoice.find()
      .populate("patient", "name email phone avatarUrl")
      .populate("appointment", "paidAmount")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      invoices,
      count: invoices.length,
    });
  } catch (error) {
    console.error("Error in getInvoices:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error fetching invoices",
    });
  }
};

/**
 * GET /api/v1/admin/wards
 * Returns all wards
 */
export const getWards = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { Ward } = await import("../models/ward.model.js");
    const wards = await Ward.find().sort({ name: 1 });
    res.status(StatusCodes.OK).json({ success: true, wards });
  } catch (error) {
    console.error("Error in getWards:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error fetching wards" });
  }
};

/**
 * GET /api/v1/admin/inventory
 * Returns all inventory supplies
 */
export const getInventory = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { Inventory } = await import("../models/inventory.model.js");
    const inventory = await Inventory.find().sort({ itemName: 1 });
    res.status(StatusCodes.OK).json({ success: true, inventory });
  } catch (error) {
    console.error("Error in getInventory:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error fetching inventory" });
  }
};

/**
 * GET /api/v1/admin/audit-logs
 * Returns audit logs
 */
export const getAuditLogs = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { AuditLog } = await import("../models/audit-log.model.js");
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.status(StatusCodes.OK).json({ success: true, logs });
  } catch (error) {
    console.error("Error in getAuditLogs:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error fetching audit logs" });
  }
};

/**
 * GET /api/v1/admin/integrations
 * Returns integrations and API keys
 */
export const getIntegrations = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { Integration } = await import("../models/integration.model.js");
    const integrations = await Integration.find().sort({
      type: -1,
      name: 1,
      label: 1,
    });
    res.status(StatusCodes.OK).json({ success: true, integrations });
  } catch (error) {
    console.error("Error in getIntegrations:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error fetching integrations" });
  }
};

export const createWard = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const parsed = wardSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid ward data",
        errors: parsed.error.format(),
      });
      return;
    }
    const { Ward } = await import("../models/ward.model.js");
    const ward = await Ward.create(parsed.data);
    emitAdminDataChanged(["wards"], "ward_created");
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(
      actor,
      `Created ward ${ward.name}`,
      `ward:${ward._id.toString().slice(-6)}`,
      "info",
    );
    res.status(StatusCodes.CREATED).json({ success: true, ward });
  } catch (error) {
    console.error("Error creating ward:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error creating ward" });
  }
};

export const updateWard = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const parsed = wardSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid ward data",
        errors: parsed.error.format(),
      });
      return;
    }
    const { Ward } = await import("../models/ward.model.js");
    const ward = await Ward.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
    });
    if (!ward) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Ward not found" });
      return;
    }
    emitAdminDataChanged(["wards"], "ward_updated");
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(
      actor,
      `Updated ward ${ward.name}`,
      `ward:${ward._id.toString().slice(-6)}`,
      "info",
    );
    res.status(StatusCodes.OK).json({ success: true, ward });
  } catch (error) {
    console.error("Error updating ward:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error updating ward" });
  }
};

export const deleteWard = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { Ward } = await import("../models/ward.model.js");
    const ward = await Ward.findByIdAndDelete(req.params.id);
    if (!ward) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Ward not found" });
      return;
    }
    emitAdminDataChanged(["wards"], "ward_deleted");
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(
      actor,
      `Deleted ward ${ward.name}`,
      `ward:${ward._id.toString().slice(-6)}`,
      "warn",
    );
    res.status(StatusCodes.OK).json({ success: true, message: "Ward deleted" });
  } catch (error) {
    console.error("Error deleting ward:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error deleting ward" });
  }
};

export const createInventoryItem = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const parsed = inventorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid inventory data",
        errors: parsed.error.format(),
      });
      return;
    }
    const { Inventory } = await import("../models/inventory.model.js");
    const item = await Inventory.create(parsed.data);
    emitAdminDataChanged(["inventory"], "inventory_created");
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(
      actor,
      `Created inventory item ${item.itemName}`,
      `inventory:${item._id.toString().slice(-6)}`,
      "info",
    );
    res.status(StatusCodes.CREATED).json({ success: true, item });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error creating inventory item",
    });
  }
};

export const updateInventoryItem = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const parsed = inventorySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid inventory data",
        errors: parsed.error.format(),
      });
      return;
    }
    const { Inventory } = await import("../models/inventory.model.js");
    const existing = await Inventory.findById(req.params.id);
    if (!existing) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Item not found" });
      return;
    }
    if (
      parsed.data.currentStock !== undefined &&
      parsed.data.currentStock < (existing.reservedStock || 0)
    ) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: `At least ${existing.reservedStock} ${existing.unit} are reserved for unpaid pharmacy bills`,
      });
      return;
    }
    const item = await Inventory.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
    });
    if (!item) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Item not found" });
      return;
    }
    emitAdminDataChanged(["inventory"], "inventory_updated");
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(
      actor,
      `Updated inventory item ${item.itemName}`,
      `inventory:${item._id.toString().slice(-6)}`,
      "info",
    );
    res.status(StatusCodes.OK).json({ success: true, item });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error updating inventory item",
    });
  }
};

export const deleteInventoryItem = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { Inventory } = await import("../models/inventory.model.js");
    const existing = await Inventory.findById(req.params.id);
    if (existing && existing.reservedStock > 0) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: "This item has quantities reserved for unpaid pharmacy bills",
      });
      return;
    }
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Item not found" });
      return;
    }
    emitAdminDataChanged(["inventory"], "inventory_deleted");
    const actor = req.user?.id ? `admin:${req.user.id.slice(-6)}` : "system";
    await logAudit(
      actor,
      `Deleted inventory item ${item.itemName}`,
      `inventory:${item._id.toString().slice(-6)}`,
      "warn",
    );
    res.status(StatusCodes.OK).json({ success: true, message: "Item deleted" });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error deleting inventory item",
    });
  }
};
