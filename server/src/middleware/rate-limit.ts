import rateLimit from "express-rate-limit";
import { StatusCodes } from "http-status-codes";

const authLimitResponse = {
  success: false,
  message: "Too many authentication attempts. Please try again later.",
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  message: authLimitResponse,
  skip: () => process.env.NODE_ENV === "test",
});

export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: StatusCodes.TOO_MANY_REQUESTS,
  message: {
    success: false,
    message: "Too many OTP requests. Please wait before trying again.",
  },
  skip: () => process.env.NODE_ENV === "test",
});
