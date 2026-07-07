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
                success: true,
                subscription: null,
                limits: null,
                canResume: false,
            });
        }

        return res.status(200).json({
            success: true,
            subscription,
            limits:
                PLANS[
                subscription.plan as keyof typeof PLANS
                ],
            canResume:
                subscription.status === "ACTIVE" &&
                subscription.cancelAtPeriodEnd === true,
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
 * Body:
 * {
 *   "immediate": true
 * }
 *
 * immediate = false (default)
 *  - User keeps access until endsAt.
 *  - User cannot purchase another subscription.
 *  - User may resume before expiry.
 *
 * immediate = true
 *  - Subscription ends immediately.
 *  - Access is revoked.
 *  - User may purchase another subscription immediately.
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
                ? "Subscription cancelled immediately. You may subscribe again at any time."
                : "Subscription will remain active until the end of your current billing period. You can resume it anytime before it expires.",
            subscription,
            canResume:
                !immediate &&
                subscription.status === "ACTIVE" &&
                subscription.cancelAtPeriodEnd === true,
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