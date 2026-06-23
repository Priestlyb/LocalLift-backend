import { Response } from "express";

import Content from "../models/Content";
import Business from "../models/Business";
import Subscription from "../models/Subscription";
import User from "../models/User";

import { AuthRequest } from "../middleware/auth.middleware";
import { getOrCreateUsage } from "../services/usage.service";
import { PLANS } from "../constants/plans";

export const getDashboardAnalytics = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = await User.findById(
      req.userId
    ).select("name");

    const business = await Business.findOne({
      owner: req.userId,
    });

    const subscription =
      await Subscription.findOne({
        user: req.userId,
      });

    const usage = await getOrCreateUsage(
      req.userId!
    );

    const totalGenerations =
      await Content.countDocuments({
        user: req.userId,
      });

    const recentContent = await Content.find({
      user: req.userId,
    })
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .select(
        "_id type generatedContent createdAt"
      );

    const currentPlan =
      subscription?.plan || "FREE";

    const planConfig =
      PLANS[
        currentPlan as keyof typeof PLANS
      ];

    const limit =
      planConfig?.monthlyGenerations || 0;

    const used =
      usage?.generationsUsed || 0;

    const remaining = Math.max(
      0,
      limit - used
    );

    const usagePercentage =
      limit > 0
        ? Math.min(
            100,
            Math.round((used / limit) * 100)
          )
        : 0;

    return res.status(200).json({
      adminName: user?.name || null,

      hasBusiness: !!business,

      business: business
        ? {
            id: business._id,
            businessName:
              business.businessName,
            category:
              business.category,
            description:
              business.description,
            city: business.city,
            state: business.state,
            country:
              business.country,
            logo: business.logo,
          }
        : null,

      subscription: {
        plan: currentPlan,

        status:
          subscription?.status ||
          "ACTIVE",

        expiresAt:
          subscription?.expiresAt ||
          null,
      },

      analytics: {
        totalGenerations,

        monthlyUsage: used,

        remaining,

        limit,

        usagePercentage,
      },

      recentContent,
    });
  } catch (error) {
    console.error(
      "Dashboard Analytics Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch dashboard analytics",
    });
  }
};