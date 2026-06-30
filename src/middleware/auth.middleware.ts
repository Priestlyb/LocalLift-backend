import {
  Request,
  Response,
  NextFunction,
} from "express";
import jwt from "jsonwebtoken";

import User from "../models/User";

export interface AuthRequest
  extends Request {
  userId?: string;
  role?:
    | "ADMIN"
    | "CUSTOMER"
    | "CUSTOMER_STAFF";
}

interface JwtPayload {
  userId: string;
  role:
    | "ADMIN"
    | "CUSTOMER"
    | "CUSTOMER_STAFF";
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "No token provided",
      });
    }

    if (
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        message:
          "Invalid token format",
      });
    }

    const token =
      authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message:
          "Invalid token format",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    const user =
      await User.findById(
        decoded.userId
      );

    if (!user) {
      return res.status(401).json({
        message:
          "User account no longer exists",
      });
    }

    req.userId =
      user._id.toString();

    req.role = user.role;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

export const authorize = (
  ...roles: Array<
    | "ADMIN"
    | "CUSTOMER"
    | "CUSTOMER_STAFF"
  >
) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.role) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (
      !roles.includes(req.role)
    ) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    next();
  };
};