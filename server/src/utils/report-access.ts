import { DiagnosticOrder, EmergencyCase, UserRole } from "../models/index.js";
import type { IDiagnosticReport } from "../models/diagnostic-report.model.js";
import type { IUser } from "../models/user.model.js";

/** Keep protected report viewing and AI access on the exact same policy. */
export async function canAccessDiagnosticReport(
  user: IUser,
  report: IDiagnosticReport,
): Promise<boolean> {
  const userId = String(user._id);
  const isPatientOwner =
    user.role === UserRole.PATIENT &&
    String(report.patient) === userId &&
    report.state === "verified";
  const isAdmin = user.role === UserRole.ADMIN;
  const isUploader = String(report.uploadedBy || "") === userId;
  const isAssignedDoctor =
    user.role === UserRole.DOCTOR &&
    report.state === "verified" &&
    Boolean(
      report.order &&
      (await DiagnosticOrder.exists({
        _id: report.order,
        doctor: user._id,
      })),
    );
  const order = report.order
    ? await DiagnosticOrder.findById(report.order).select(
        "testType doctor emergencyCase",
      )
    : null;
  const emergencyCaseId = report.emergencyCase || order?.emergencyCase;
  const emergencyCase = emergencyCaseId
    ? await EmergencyCase.findById(emergencyCaseId).select(
        "assignedDoctor isArchived",
      )
    : null;
  const isAssignedEdClinician = Boolean(
    report.state === "verified" &&
    emergencyCase &&
    !emergencyCase.isArchived &&
    (user.role === UserRole.EMERGENCY_DOCTOR ||
      user.role === UserRole.DOCTOR) &&
    String(emergencyCase.assignedDoctor || "") === userId,
  );
  const isEdNurse = Boolean(
    report.state === "verified" &&
    emergencyCase &&
    !emergencyCase.isArchived &&
    user.role === UserRole.NURSE,
  );
  const isDiagnosticStaff = Boolean(
    order &&
    ((user.role === UserRole.LAB_TECHNICIAN &&
      order.testType === "PATHOLOGY") ||
      (user.role === UserRole.RADIOLOGIST && order.testType === "RADIOLOGY")),
  );
  return (
    isPatientOwner ||
    isAdmin ||
    isUploader ||
    isAssignedDoctor ||
    isAssignedEdClinician ||
    isEdNurse ||
    isDiagnosticStaff
  );
}
