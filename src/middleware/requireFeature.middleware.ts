import {
  NextFunction,
  Response,
} from "express";

import Subscription from "../models/Subscription";

import { AuthRequest } from "./auth.middleware";

import { Feature } from "../constants/features";

import featureService from "../services/subscription/feature.service";

/**
 * Creates middleware that ensures the
 * authenticated user has access to
 * a specific subscription feature.
 */
const requireFeature =
  (feature: Feature) =>
  async (
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
        featureService.canUseFeature({
          plan: subscription.plan,
          status: subscription.status,
          feature,
        });

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message:
            "Your current subscription does not include this feature.",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export default requireFeature;