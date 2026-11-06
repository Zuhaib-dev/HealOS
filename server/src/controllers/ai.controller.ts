import { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { AppError } from "../middleware/error-handler";
import {
  DiagnosticOrder,
  DiagnosticReport,
  UserRole,
} from "../models/index.js";
import path from "path";
import fs from "fs";
import { canAccessDiagnosticReport } from "../utils/report-access.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getReportContent(
  req: Request,
  reportId?: string,
  fileUrl?: string,
) {
  const user = req.user;
  if (!user) throw new AppError("Sign in to access this report", 401);
  let resolvedReportId = reportId;
  let report = null;
  let isPatientOwnedReleasedReport = false;
  const reportCandidates: Record<string, unknown>[] = [];
  if (reportId && /^[a-f\d]{24}$/i.test(reportId))
    reportCandidates.push({ _id: reportId });
  if (fileUrl) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(fileUrl, "http://local.invalid");
    } catch {
      throw new AppError("Invalid report URL", 400);
    }
    const protectedReportId = parsedUrl.pathname.match(
      /\/api\/v1\/reports\/([a-f\d]{24})\/file\/?$/i,
    )?.[1];
    if (protectedReportId) reportCandidates.push({ _id: protectedReportId });
    reportCandidates.push({ fileUrl });
    if (parsedUrl.pathname.startsWith("/uploads/reports/")) {
      const fileName = path.basename(parsedUrl.pathname);
      reportCandidates.push({ localFileName: fileName });
      reportCandidates.push({ fileUrl: parsedUrl.pathname });
    }
  }
  const patientOrderIds = await DiagnosticOrder.find({
    patient: user._id,
  }).distinct("_id");
  if (reportCandidates.length) {
    report = await DiagnosticReport.findOne({
      state: "verified",
      $and: [
        {
          $or: [
            { patient: user._id },
            { uploadedBy: user._id.toString() },
            { order: { $in: patientOrderIds } },
          ],
        },
        { $or: reportCandidates },
      ],
    }).select("+localFileName fileUrl fileName patient order uploadedBy state");
    if (report) {
      resolvedReportId = String(report._id);
      isPatientOwnedReleasedReport = report.state === "verified";
    }
  }
  if (!resolvedReportId && fileUrl) {
    // Older report rows/UI versions may send the stored URL instead of the
    // report ID. Resolve only URLs already attached to a report in our DB;
    // the report's normal ownership and release checks still apply below.
    let parsedFileUrl: URL;
    try {
      parsedFileUrl = new URL(fileUrl, "http://local.invalid");
    } catch {
      throw new AppError("Invalid report URL", 400);
    }
    const protectedFileMatch = parsedFileUrl.pathname.match(
      /\/api\/v1\/reports\/([a-f\d]{24})\/file\/?$/i,
    );
    if (protectedFileMatch) resolvedReportId = protectedFileMatch[1];
    else {
      const storedReport = await DiagnosticReport.findOne({ fileUrl })
        .select("_id")
        .lean();
      if (storedReport) resolvedReportId = String(storedReport._id);
    }
  }
  if (resolvedReportId && !report) {
    report = await DiagnosticReport.findById(resolvedReportId).select(
      "+localFileName fileUrl fileName patient order uploadedBy state",
    );
  }
  if (report) {
    const hasAccess = await canAccessDiagnosticReport(user, report);
    if (!hasAccess) {
      console.warn("AI report access denied", {
        role: user.role,
        released: report.state === "verified",
        patientScopedMatch: isPatientOwnedReleasedReport,
      });
      throw new AppError("You do not have access to this report", 403);
    }
    if (
      user.role !== UserRole.ADMIN &&
      String(report.uploadedBy || "") !== String(user._id) &&
      user.role !== UserRole.LAB_TECHNICIAN &&
      user.role !== UserRole.RADIOLOGIST &&
      report.state !== "verified"
    )
      throw new AppError("This report has not been released", 403);
    if (report.localFileName) {
      const safeName = path.basename(report.localFileName);
      const reportPath = path.resolve(
        process.cwd(),
        "uploads",
        "reports",
        safeName,
      );
      const reportRoot =
        path.resolve(process.cwd(), "uploads", "reports") + path.sep;
      if (!reportPath.startsWith(reportRoot) || !fs.existsSync(reportPath))
        throw new AppError("Report file is unavailable", 404);
      return {
        buffer: await fs.promises.readFile(reportPath),
        mimeType: report.fileName?.toLowerCase().endsWith(".png")
          ? "image/png"
          : report.fileName?.toLowerCase().match(/\.jpe?g$/)
            ? "image/jpeg"
            : "application/pdf",
      };
    }
    fileUrl = report.fileUrl;
    if (fileUrl) {
      let parsedFileUrl: URL;
      try {
        parsedFileUrl = new URL(fileUrl, "http://local.invalid");
      } catch {
        throw new AppError("Invalid report URL", 400);
      }
      if (parsedFileUrl.pathname.startsWith("/uploads/reports/")) {
        const legacyName = path.basename(parsedFileUrl.pathname);
        const reportPath = path.resolve(
          process.cwd(),
          "uploads",
          "reports",
          legacyName,
        );
        const reportRoot =
          path.resolve(process.cwd(), "uploads", "reports") + path.sep;
        if (!reportPath.startsWith(reportRoot) || !fs.existsSync(reportPath))
          throw new AppError("Report file is unavailable", 404);
        const ext = path.extname(reportPath).toLowerCase();
        return {
          buffer: await fs.promises.readFile(reportPath),
          mimeType:
            ext === ".png"
              ? "image/png"
              : ext === ".jpg" || ext === ".jpeg"
                ? "image/jpeg"
                : "application/pdf",
        };
      }
    }
  }
  if (req.user?.role !== UserRole.ADMIN && !resolvedReportId && fileUrl)
    throw new AppError("Select a released report from your account", 403);
  if (!fileUrl) throw new AppError("Report file is unavailable", 404);
  let localUrlPath = "";
  try {
    const parsed = new URL(fileUrl, "http://local.invalid");
    if (parsed.pathname.startsWith("/uploads/reports/"))
      localUrlPath = parsed.pathname;
  } catch {
    /* handled as invalid URL below */
  }
  if (localUrlPath) {
    const safeName = path.basename(localUrlPath);
    const legacyReport = await DiagnosticReport.findOne({
      $or: [
        { localFileName: safeName },
        {
          fileUrl: {
            $regex: `/uploads/reports/${safeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          },
        },
      ],
    }).select("+localFileName fileUrl fileName patient state");
    if (!legacyReport) throw new AppError("Report not found", 404);
    if (req.user?.role !== UserRole.ADMIN && legacyReport.state !== "verified")
      throw new AppError("This report has not been released", 403);
    if (
      req.user?.role !== UserRole.ADMIN &&
      legacyReport.patient.toString() !== req.user?._id.toString()
    )
      throw new AppError("You do not have access to this report", 403);
    return getReportContent(req, legacyReport._id.toString());
  }
  let parsed: URL;
  try {
    parsed = new URL(fileUrl);
  } catch {
    throw new AppError("Invalid file URL", 400);
  }
  if (parsed.hostname !== "ik.imagekit.io")
    throw new AppError("Only trusted report storage URLs are allowed", 403);
  const response = await fetch(fileUrl);
  if (!response.ok)
    throw new AppError(
      "Unable to retrieve the report",
      response.status === 404 ? 404 : 400,
    );
  const extension = parsed.pathname.split(".").pop()?.toLowerCase();
  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : "application/pdf";
  return { buffer: Buffer.from(await response.arrayBuffer()), mimeType };
}

export const generateBio = async (req: Request, res: Response) => {
  try {
    const { role, keywords } = req.body;

    if (!keywords || typeof keywords !== "string") {
      throw new AppError("Keywords are required for bio generation", 400);
    }

    const isPatient = role?.toUpperCase() === "PATIENT";
    const context = isPatient
      ? "The user is a patient on this platform. Write a brief personal bio about their lifestyle, hobbies, and health background."
      : `The user is a healthcare professional (Role: ${role || "Doctor"}). Write a brief professional bio focusing on their expertise, care philosophy, and experience.`;

    const prompt = `You are an expert profile writer for a high-end medical portal.
${context}
Write a very brief, engaging bio (maximum 2 short sentences) based on the following keywords: ${keywords}.
Keep it extremely concise. Do not use any formatting like bolding or bullet points. Just output the plain text bio.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    res.status(200).json({
      success: true,
      bio: response.text,
    });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate bio" });
  }
};

export const explainReport = async (req: Request, res: Response) => {
  try {
    const { reportId, fileUrl } = req.body;
    if (!reportId && !fileUrl) throw new AppError("Report ID is required", 400);
    const content = await getReportContent(req, reportId, fileUrl);
    const base64Data = content.buffer.toString("base64");
    const mimeType = content.mimeType;

    const prompt = `You are an empathetic, expert medical AI. Review this lab report or medical document. Explain the findings to the patient in simple, non-jargon terms.
    
CRITICAL FORMATTING RULES:
1. Do NOT use horizontal rules (no \`---\` or \`***\`).
2. Use clean, simple headings (e.g., \`## Overview\`, \`### Abnormal Findings\`).
3. Keep the text highly structured with bullet points.
4. Highlight abnormal values clearly but in a reassuring tone.
5. Always end by advising them to discuss these results with their doctor for clinical decisions.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    res.status(200).json({
      success: true,
      explanation: response.text,
    });
  } catch (error: any) {
    console.error("AI Report Explanation Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to explain report",
    });
  }
};

export const chatReport = async (req: Request, res: Response) => {
  try {
    const { messages, fileUrl, reportId } = req.body;
    if (!messages || !Array.isArray(messages)) {
      throw new AppError("Messages array is required", 400);
    }

    const contents: any[] = [];

    // Process the file if provided
    let filePart = null;
    if (reportId || fileUrl) {
      const content = await getReportContent(req, reportId, fileUrl);
      filePart = {
        inlineData: {
          data: content.buffer.toString("base64"),
          mimeType: content.mimeType,
        },
      };
    }

    // Map history to Gemini format
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const parts: any[] = [{ text: msg.text }];

      // Attach the file to the very first user message
      if (i === 0 && msg.role === "user" && filePart) {
        parts.unshift(filePart);
      }

      contents.push({
        role: msg.role === "ai" || msg.role === "model" ? "model" : "user",
        parts: parts,
      });
    }

    const systemInstruction = `You are an empathetic, expert medical AI assistant helping a patient understand their lab report and health.
CRITICAL RULES:
1. ONLY answer questions related to health, medicine, diet, wellness, or the patient's lab report.
2. If the user asks about unrelated topics (e.g., sports, programming, politics), politely decline and remind them you are a medical AI.
3. Keep answers concise, highly structured (use bullet points), and easy to read. Do NOT use horizontal rules (\`---\`).
4. You have access to Google Search. Use it to provide up-to-date, grounded advice (e.g., diet recommendations for fatty liver).
5. Always end with a disclaimer that your advice is for informational purposes and they should consult their doctor.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    res.status(200).json({
      success: true,
      text: response.text,
    });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to process chat",
    });
  }
};

export const generateVitalsSummary = async (req: Request, res: Response) => {
  try {
    const { vitals, profile } = req.body;

    if (!vitals || !Array.isArray(vitals) || vitals.length === 0) {
      throw new AppError("No vitals data provided for analysis", 400);
    }

    const prompt = `You are an empathetic, expert medical AI assistant.
Review the following recent vitals and profile for a patient.
Profile:
- Age/DOB: ${profile?.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : "Unknown"}
- BMI: ${profile?.bmi || "Unknown"}

Recent Vitals (latest first):
${vitals
  .slice(0, 10)
  .map(
    (v: any) =>
      `- Date: ${new Date(v.date).toLocaleDateString()}, BP: ${v.bloodPressure}, HR: ${v.heartRate} bpm, Temp: ${v.temperature}°F, SpO2: ${v.spO2}%, Weight: ${v.weight} kg`,
  )
  .join("\n")}

Provide a short, structured predictive health summary highlighting any concerning trends or reassuring stability.
CRITICAL FORMATTING RULES:
1. Do NOT use horizontal rules (no \`---\` or \`***\`).
2. Use clean, simple headings (e.g., \`## Health Summary\`, \`### Key Trends\`).
3. Keep the text highly structured with bullet points.
4. Keep the tone empathetic and reassuring.
5. Always end by advising them to discuss these results with their doctor for clinical decisions.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    res.status(200).json({
      success: true,
      summary: response.text,
    });
  } catch (error: any) {
    console.error("AI Vitals Summary Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate health summary",
    });
  }
};
