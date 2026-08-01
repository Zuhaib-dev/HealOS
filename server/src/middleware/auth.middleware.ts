import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { envConfig } from "../config/env";
import { User, IUser, UserRole } from "../models";

// Extend Express Request object to include the user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface JwtPayload {
  userId: string;
  role: UserRole;
}

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Not authorized to access this route. No token provided.",
      });
      return;
    }

    const decoded = jwt.verify(token, envConfig.JWT_SECRET) as JwtPayload;

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "The user belonging to this token does no longer exist.",
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Not authorized to access this route. Invalid token.",
    });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Not authenticated.",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route.`,
      });
      return;
    }

    next();
  };
};
