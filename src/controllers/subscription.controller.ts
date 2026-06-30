import { Response } from "express";

import Subscription from "../models/Subscription";
import { AuthRequest } from "../middleware/auth.middleware";
import { PLANS } from "../constants/plans";

/**
 * GET SUBSCRIPTION
 */
export const getSubscription = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        let subscription = await Subscription.findOne({
            user: req.userId,
        });

        if (!subscription) {
            return res.status(404).json({
                message: "Subscription not found",
            });
        }

        return res.json({
            subscription,
            limits:
                PLANS[
                subscription.plan as keyof typeof PLANS
                ],
        });
    } catch (error) {
        console.error("Get Subscription Error:", error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

/**
 * CANCEL SUBSCRIPTION
 */
export const cancelSubscription = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const subscription =
            await Subscription.findOne({
                user: req.userId,
            });

        if (!subscription) {
            return res.status(404).json({
                message:
                    "Subscription not found",
            });
        }

        if (
            subscription.plan ===
            "FREE"
        ) {
            return res.status(400).json({
                message:
                    "Free subscriptions cannot be cancelled.",
            });
        }

        if (
            subscription.status ===
            "CANCELLED"
        ) {
            return res.status(400).json({
                message:
                    "Subscription is already cancelled.",
                subscription,
            });
        }

        subscription.status =
            "CANCELLED";

        subscription.cancelledAt =
            new Date();

        subscription.autoRenew =
            false;

        await subscription.save();

        return res.status(200).json({
            success: true,
            message:
                "Subscription cancelled successfully.",
            subscription,
        });
    } catch (error) {
        console.error(
            "Cancel Subscription Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Server Error",
        });
    }
};