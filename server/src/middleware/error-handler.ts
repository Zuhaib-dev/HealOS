// ============================================
// HealOS Server — Global Error Handler
// ============================================
import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "@healos/shared";
import { envConfig } from "../config/env.js";

// Custom error class for operational errors
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Express error handler middleware
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Default values
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = "Internal Server Error";

  // Handle our custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Handle Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = StatusCodes.BAD_REQUEST;
    message = err.message;
  }

  // Handle Mongoose duplicate key errors
  if (err.name === "MongoServerError" && (err as Record<string, unknown>).code === 11000) {
    statusCode = StatusCodes.CONFLICT;
    message = "Duplicate field value entered";
  }

  // Handle Mongoose cast errors (bad ObjectId)
  if (err.name === "CastError") {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Invalid resource ID";
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = "Token expired";
  }

  const response: ApiResponse = {
    success: false,
    message,
    error: envConfig.NODE_ENV === "development" ? err.stack : undefined,
  };

  // Log error in development
  if (envConfig.NODE_ENV === "development") {
    console.error("❌ Error:", err);
  }

  res.status(statusCode).json(response);
};
