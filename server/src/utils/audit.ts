import { AuditLog } from "../models/index.js";

export const logAudit = async (actor: any, action: string, target?: string, level: "info" | "warn" | "crit" = "info") => {
  try {
    const actorStr = typeof actor === "string" ? actor : actor?.name || actor?.email || actor?._id?.toString() || "System";
    await AuditLog.create({
      actor: actorStr,
      action,
      target,
      level,
    });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
};
