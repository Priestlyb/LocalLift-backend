import {
  Request,
  Response,
  NextFunction,
} from "express";

import User from "../models/User";

import { verifyToken } from "../utils/jwt";

/**
 * Supported application roles.
 */
export type UserRole =
  | "ADMIN"
  | "CUSTOMER"
  | "CUSTOMER_STAFF";

/**
 * Express request with authenticated
 * user information attached.
 */
export interface AuthRequest
  extends Request {
  userId?: string;
  role?: UserRole;
}

/**
 * Protect authenticated routes.
 *
 * Authentication flow:
 *
 * Authorization header
 *       ↓
 * Bearer token
 *       ↓
 * Verify JWT signature
 *       ↓
 * Verify expiration
 *       ↓
 * Verify issuer
 *       ↓
 * Verify audience
 *       ↓
 * Extract user ID
 *       ↓
 * Find current user in database
 *       ↓
 * Attach current user information
 *       ↓
 * Continue request
 */
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader =
      req.headers.authorization;

    /**
     * Authorization header is required.
     */
    if (!authHeader) {
      return res.status(401).json({
        message:
          "Authentication required.",
      });
    }

    /**
     * Only accept:
     *
     * Authorization: Bearer <token>
     */
    if (
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        message:
          "Invalid authentication format.",
      });
    }

    /**
     * Extract token safely.
     */
    const token =
      authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        message:
          "Authentication token is missing.",
      });
    }

    /**
     * Verify:
     *
     * - Signature
     * - Expiration
     * - Issuer
     * - Audience
     * - Algorithm
     */
    const decoded =
      verifyToken(token);

    /**
     * `sub` is the standard JWT subject
     * claim containing the user ID.
     */
    const userId = decoded.sub;

    if (
      !userId ||
      typeof userId !== "string"
    ) {
      return res.status(401).json({
        message:
          "Invalid authentication token.",
      });
    }

    /**
     * Fetch the CURRENT user from the
     * database.
     *
     * This is important because:
     *
     * - User may have been deleted.
     * - User's role may have changed.
     * - Account may have been disabled.
     *
     * We do not blindly trust the role
     * contained in the JWT.
     */
    const user =
      await User.findById(userId)
        .select("_id role");

    if (!user) {
      return res.status(401).json({
        message:
          "Authentication failed.",
      });
    }

    /**
     * Make sure the role is one of the
     * roles supported by the application.
     */
    const validRoles: UserRole[] = [
      "ADMIN",
      "CUSTOMER",
      "CUSTOMER_STAFF",
    ];

    if (
      !validRoles.includes(
        user.role as UserRole
      )
    ) {
      return res.status(403).json({
        message:
          "Account role is not authorized.",
      });
    }

    /**
     * Attach authenticated user data
     * to the request.
     */
    req.userId =
      user._id.toString();

    req.role =
      user.role as UserRole;

    next();
  } catch (error) {
    /**
     * Never expose JWT verification
     * details to the client.
     *
     * This prevents leaking information
     * about why a token failed.
     */
    return res.status(401).json({
      message:
        "Authentication failed.",
    });
  }
};

/**
 * Restrict a route to specific roles.
 *
 * Example:
 *
 * authorize("CUSTOMER")
 *
 * or:
 *
 * authorize(
 *     "CUSTOMER",
 *     "ADMIN"
 * )
 */
export const authorize = (
  ...roles: UserRole[]
) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    /**
     * protect middleware must run before
     * authorize middleware.
     */
    if (
      !req.userId ||
      !req.role
    ) {
      return res.status(401).json({
        message:
          "Authentication required.",
      });
    }

    /**
     * Check the CURRENT role loaded
     * from the database.
     */
    if (
      !roles.includes(req.role)
    ) {
      return res.status(403).json({
        message:
          "You do not have permission to perform this action.",
      });
    }

    next();
  };
};