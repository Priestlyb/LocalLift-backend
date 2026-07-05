import { Response } from "express";

import { AuthRequest } from "../middleware/auth.middleware";

import { PLANS } from "../constants/plans";

import {
    getSubscription as getUserSubscription,
    cancelSubscription as cancelUserSubscription,
} from "../services/subscription/subscription.service";

/**
 * GET CURRENT SUBSCRIPTION
 */
export const getSubscription = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const subscription =
            await getUserSubscription(req.userId);

        if (!subscription) {
            return res.status(200).json({
                subscription: null,
                limits: null,
            });
        }

        return res.status(200).json({
            success: true,
            subscription,
            limits:
                PLANS[
                subscription.plan as keyof typeof PLANS
                ],
        });
    } catch (error) {
        console.error(
            "Get Subscription Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

/**
 * CANCEL SUBSCRIPTION
 *
 * By default this schedules the cancellation
 * for the end of the current billing cycle.
 *
 * Send:
 * {
 *   "immediate": true
 * }
 *
 * to revoke access immediately.
 */
export const cancelSubscription = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const immediate =
            req.body?.immediate === true;

        const subscription =
            await cancelUserSubscription(
                req.userId,
                immediate
            );

        return res.status(200).json({
            success: true,
            message: immediate
                ? "Subscription cancelled immediately."
                : "Subscription will be cancelled at the end of the current billing period.",
            subscription,
        });
    } catch (error: any) {
        console.error(
            "Cancel Subscription Error:",
            error
        );

        return res.status(400).json({
            success: false,
            message:
                error?.message ??
                "Failed to cancel subscription",
        });
    }
};