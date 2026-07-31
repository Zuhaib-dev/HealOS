// ============================================
// HealOS Server — 404 Not Found Handler
// ============================================
import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "@healos/shared";

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  };
  res.status(StatusCodes.NOT_FOUND).json(response);
};
