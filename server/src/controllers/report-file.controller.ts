import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import {
  DiagnosticOrder,
  DiagnosticReport,
  UserRole,
} from "../models/index.js";

const reportsDirectory = path.resolve(process.cwd(), "uploads", "reports");

export async function getDiagnosticReportFile(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const report = await DiagnosticReport.findById(req.params.id).select(
      "+localFileName",
    );
    if (!report) {
      res.status(404).json({ success: false, message: "Report not found" });
      return;
    }
    const user = req.user;
    if (!user) {
      res
        .status(401)
        .json({ success: false, message: "Sign in to access this report" });
      return;
    }

    const isPatientOwner =
      user.role === UserRole.PATIENT &&
      report.patient.toString() === user._id.toString();
    const isAdmin = user.role === UserRole.ADMIN;
    const uploadedByUser = report.uploadedBy === user._id.toString();
    const isAssignedDoctor =
      user.role === UserRole.DOCTOR &&
      report.order &&
      Boolean(
        await DiagnosticOrder.exists({ _id: report.order, doctor: user._id }),
      );
    const order = report.order
      ? await DiagnosticOrder.findById(report.order).select("testType")
      : null;
    const isDiagnosticStaff = Boolean(
      order &&
      ((user.role === UserRole.LAB_TECHNICIAN &&
        order.testType === "PATHOLOGY") ||
        (user.role === UserRole.RADIOLOGIST && order.testType === "RADIOLOGY")),
    );
    if (!(
      isPatientOwner ||
      isAdmin ||
      uploadedByUser ||
      isAssignedDoctor ||
      isDiagnosticStaff
    )) {
      res
        .status(403)
        .json({
          success: false,
          message: "You do not have access to this report",
        });
      return;
    }

    let localName = report.localFileName;
    if (!localName && report.fileUrl) {
      try {
        const parsed = new URL(report.fileUrl, "http://local.invalid");
        if (parsed.pathname.startsWith("/uploads/reports/"))
          localName = path.basename(parsed.pathname);
      } catch {
        /* invalid historical URL; handled as unavailable below */
      }
    }
    if (localName) {
      const safeName = path.basename(localName);
      const filePath = path.resolve(reportsDirectory, safeName);
      if (
        !filePath.startsWith(`${reportsDirectory}${path.sep}`) ||
        !fs.existsSync(filePath)
      ) {
        res
          .status(404)
          .json({
            success: false,
            message: "The locally stored report is unavailable",
          });
        return;
      }
      const ext = path.extname(safeName).toLowerCase();
      const mime =
        ext === ".pdf"
          ? "application/pdf"
          : ext === ".png"
            ? "image/png"
            : ext === ".jpg" || ext === ".jpeg"
              ? "image/jpeg"
              : "application/octet-stream";
      res.setHeader("Content-Type", mime);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${path.basename(report.fileName || safeName).replace(/[\r\n"]+/g, "_")}"`,
      );
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.sendFile(filePath);
      return;
    }
    if (report.fileUrl?.startsWith("https://ik.imagekit.io/")) {
      res.setHeader("Cache-Control", "private, no-store");
      res.json({ externalUrl: report.fileUrl });
      return;
    }
    res
      .status(404)
      .json({ success: false, message: "Report file is unavailable" });
  } catch (error) {
    console.error("getDiagnosticReportFile failed", error);
    res
      .status(500)
      .json({ success: false, message: "Unable to read report file" });
  }
}
