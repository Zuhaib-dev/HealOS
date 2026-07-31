// ============================================
// HealOS Server — Request Validation Middleware
// ============================================
import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { StatusCodes } from "http-status-codes";
import type { ApiResponse } from "@healos/shared";

type ValidationTarget = "body" | "query" | "params";

/**
 * Validates request data against a Zod schema.
 * Usage: validate(myZodSchema, "body")
 */
export const validate = (schema: ZodSchema, target: ValidationTarget = "body") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.flatten();
      const response: ApiResponse = {
        success: false,
        message: "Validation failed",
        error: JSON.stringify(errors.fieldErrors),
      };
      res.status(StatusCodes.BAD_REQUEST).json(response);
      return;
    }

    // Replace with parsed (and transformed) data
    req[target] = result.data;
    next();
  };
};
