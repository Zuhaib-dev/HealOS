// ============================================
// HealOS Server — API Response Helpers
// ============================================
import type { Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "@healos/shared";

/**
 * Send a success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = "Success",
  statusCode: number = StatusCodes.OK,
  meta?: ApiResponse["meta"],
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta,
  };
  res.status(statusCode).json(response);
};

/**
 * Send a created response (201)
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  message: string = "Resource created successfully",
): void => {
  sendSuccess(res, data, message, StatusCodes.CREATED);
};

/**
 * Send a no-content response (204)
 */
export const sendNoContent = (res: Response): void => {
  res.status(StatusCodes.NO_CONTENT).send();
};

/**
 * Send a paginated response
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message: string = "Success",
): void => {
  sendSuccess(res, data, message, StatusCodes.OK, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};
