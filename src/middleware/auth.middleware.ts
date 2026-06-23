import {
  Request,
  Response,
  NextFunction,
} from "express";
import jwt from "jsonwebtoken";

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

export const protect = (
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

    const token =
      authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Invalid token format",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    req.userId = decoded.userId;
    req.role = decoded.role;

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