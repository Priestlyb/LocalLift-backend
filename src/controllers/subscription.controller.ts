import { Response } from "express";

import { AuthRequest } from "../middleware/auth.middleware";

import { PLANS } from "../constants/plans";

import {
    getSubscription as getUserSubscription,
    cancelSubscription as cancelUserSubscription,
    usageService,
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

        /**
         * No subscription found.
         * Return FREE limits.
         */
        if (!subscription) {
            return res.status(200).json({
                success: true,
                subscription: null,
                limits: PLANS.FREE,
                usage: null,
                canResume: false,
            });
        }

        /**
         * A subscription is only considered active
         * if:
         *
         * 1. Its status is ACTIVE
         * 2. It has no expiration date OR
         *    the expiration date is still in the future.
         */
        const isActive =
            subscription.status === "ACTIVE" &&
            (
                !subscription.expiresAt ||
                subscription.expiresAt > new Date()
            );

        /**
         * Return the subscription's actual plan
         * only while it is active.
         *
         * Expired/cancelled subscriptions fall back
         * to FREE limits.
         */
        const limits = isActive
            ? PLANS[
            subscription.plan as keyof typeof PLANS
            ]
            : PLANS.FREE;

        /**
         * Get current usage.
         *
         * UsageService handles:
         * - Creating the usage record if needed
         * - Resetting usage when the billing cycle changes
         * - Returning the current usage
         */
        const usage = isActive
            ? await usageService.getUsage(
                req.userId
            )
            : null;

        /**
         * Users can only resume a subscription that:
         *
         * - Is currently ACTIVE
         * - Was scheduled for cancellation
         * - Has not expired
         */
        const canResume =
            isActive &&
            subscription.cancelAtPeriodEnd === true;

        return res.status(200).json({
            success: true,
            subscription,
            limits,
            usage,
            canResume,
        });
    } catch (error: any) {
        console.error(
            "Get Subscription Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error?.message ??
                "Server Error",
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
 *  - User keeps access until expiresAt.
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
                subscription.cancelAtPeriodEnd === true &&
                (
                    !subscription.expiresAt ||
                    subscription.expiresAt > new Date()
                ),
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