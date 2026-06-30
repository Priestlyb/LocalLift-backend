import {
  NextFunction,
  Response,
} from "express";

import { AuthRequest } from "./auth.middleware";

import Subscription from "../models/Subscription";

import featureService from "../services/subscription/feature.service";

/**
 * Ensures the authenticated user has an
 * active subscription before continuing.
 *
 * FREE users are always allowed through.
 */
const requireSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const subscription =
      await Subscription.findOne({
        user: req.userId,
      });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message:
          "No subscription found.",
      });
    }

    const hasAccess =
      featureService.hasAccess({
        plan: subscription.plan,
        status: subscription.status,
        expiresAt:
          subscription.expiresAt ??
          undefined,
      });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "Your subscription has expired. Please renew to continue.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default requireSubscription;