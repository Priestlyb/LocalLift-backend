import { Response } from "express";

import { AuthRequest } from "../middleware/auth.middleware";

import { PLANS } from "../constants/plans";

import {
    getSubscription as getUserSubscription,
    cancelSubscription as cancelUserSubscription,
    usageService,
} from "../services/subscription/subscription.service";

/**
 * ==========================================
 * GET CURRENT SUBSCRIPTION
 * ==========================================
 *
 * GET /api/v1/subscription
 *
 * Returns:
 * - Current subscription
 * - Current plan limits
 * - Current usage
 * - Whether the subscription can be resumed
 */
export const getSubscription = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        /**
         * --------------------------------------
         * AUTHENTICATION
         * --------------------------------------
         */

        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        /**
         * --------------------------------------
         * GET SUBSCRIPTION
         * --------------------------------------
         */

        const subscription =
            await getUserSubscription(
                req.userId
            );

        /**
         * --------------------------------------
         * NO SUBSCRIPTION
         * --------------------------------------
         *
         * Users without a subscription are
         * automatically treated as FREE.
         */

        if (!subscription) {
            return res.status(200).json({
                success: true,
                subscription: null,
                plan: "FREE",
                limits: PLANS.FREE,
                usage: null,
                canResume: false,
            });
        }

        /**
         * --------------------------------------
         * DETERMINE ACTIVE STATUS
         * --------------------------------------
         */

        const now = new Date();

        const isActive =
            subscription.status === "ACTIVE" &&
            (
                !subscription.expiresAt ||
                subscription.expiresAt > now
            );

        /**
         * --------------------------------------
         * EFFECTIVE PLAN
         * --------------------------------------
         *
         * Expired/cancelled subscriptions should
         * not retain paid-plan entitlements.
         */

        const effectivePlan = isActive
            ? subscription.plan
            : "FREE";

        const limits =
            PLANS[
            effectivePlan as keyof typeof PLANS
            ];

        /**
         * --------------------------------------
         * GET USAGE
         * --------------------------------------
         *
         * Only active paid subscriptions need
         * usage tracking here.
         */

        const usage = isActive
            ? await usageService.getUsage(
                req.userId
            )
            : null;

        /**
         * --------------------------------------
         * CAN RESUME
         * --------------------------------------
         */

        const canResume =
            isActive &&
            subscription.cancelAtPeriodEnd ===
            true;

        /**
         * --------------------------------------
         * RESPONSE
         * --------------------------------------
         */

        return res.status(200).json({
            success: true,

            subscription,

            plan: effectivePlan,

            limits,

            usage,

            canResume,
        });
    } catch (error: unknown) {
        console.error(
            "Get Subscription Error:",
            error instanceof Error
                ? error.message
                : "Unknown error"
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch subscription.",
        });
    }
};

/**
 * ==========================================
 * GET SUBSCRIPTION USAGE
 * ==========================================
 *
 * GET /api/v1/subscription/usage
 *
 * Returns:
 * - Current plan
 * - Current subscription status
 * - Image generation limit
 * - Used image generations
 * - Remaining image generations
 * - Expiration date
 */
/**
 * ==========================================
 * GET SUBSCRIPTION USAGE
 * ==========================================
 *
 * GET /api/v1/subscription/usage
 *
 * Returns:
 * - Current plan
 * - Current subscription status
 * - Image generation limit
 * - Used image generations
 * - Remaining image generations
 * - Expiration date
 */
export const getSubscriptionUsage = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        /**
         * --------------------------------------
         * AUTHENTICATION
         * --------------------------------------
         */

        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        /**
         * --------------------------------------
         * GET SUBSCRIPTION
         * --------------------------------------
         */

        const subscription =
            await getUserSubscription(
                req.userId
            );

        /**
         * --------------------------------------
         * NO SUBSCRIPTION
         * --------------------------------------
         *
         * Users without a subscription are
         * treated as FREE.
         */

        if (!subscription) {
            const freeLimits =
                PLANS.FREE;

            const imageLimit =
                freeLimits.limits
                    .imageGenerations;

            return res.status(200).json({
                success: true,

                plan: "FREE",

                status: "ACTIVE",

                limits: {
                    imageGenerations:
                        imageLimit,

                    maxResolution:
                        freeLimits.limits
                            .maxResolution,
                },

                usage: null,

                usedImages: 0,

                remainingImages:
                    imageLimit,

                expiresAt: null,

                isActive: true,
            });
        }

        /**
         * --------------------------------------
         * DETERMINE ACTIVE STATUS
         * --------------------------------------
         */

        const now = new Date();

        const isActive =
            subscription.status === "ACTIVE" &&
            (
                !subscription.expiresAt ||
                subscription.expiresAt > now
            );

        /**
         * --------------------------------------
         * EFFECTIVE PLAN
         * --------------------------------------
         *
         * Expired/cancelled subscriptions
         * receive FREE entitlements.
         */

        const effectivePlan = isActive
            ? subscription.plan
            : "FREE";

        const planConfig =
            PLANS[
            effectivePlan as keyof typeof PLANS
            ];

        /**
         * --------------------------------------
         * GET USAGE
         * --------------------------------------
         */

        const usage = isActive
            ? await usageService.getUsage(
                req.userId
            )
            : null;

        /**
         * --------------------------------------
         * IMAGE USAGE
         * --------------------------------------
         *
         * Usage model field:
         *
         * imageGenerationsUsed
         */

        const usedImages =
            usage?.imageGenerationsUsed ?? 0;

        /**
         * --------------------------------------
         * IMAGE LIMIT
         * --------------------------------------
         */

        const imageLimit =
            planConfig.limits
                .imageGenerations;

        /**
         * --------------------------------------
         * REMAINING IMAGES
         * --------------------------------------
         */

        const remainingImages =
            Math.max(
                imageLimit - usedImages,
                0
            );

        /**
         * --------------------------------------
         * RESPONSE
         * --------------------------------------
         */

        return res.status(200).json({
            success: true,

            plan: effectivePlan,

            status:
                isActive
                    ? "ACTIVE"
                    : subscription.status,

            limits: {
                imageGenerations:
                    imageLimit,

                maxResolution:
                    planConfig.limits
                        .maxResolution,
            },

            usage,

            usedImages,

            remainingImages,

            expiresAt:
                isActive
                    ? subscription.expiresAt
                    : null,

            isActive,
        });
    } catch (error: unknown) {
        console.error(
            "Get Subscription Usage Error:",
            error instanceof Error
                ? error.message
                : "Unknown error"
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch subscription usage.",
        });
    }
};

/**
 * ==========================================
 * CANCEL SUBSCRIPTION
 * ==========================================
 *
 * POST /api/v1/subscription/cancel
 *
 * Body:
 *
 * {
 *   "immediate": true
 * }
 *
 * immediate = false/default:
 * - Subscription remains active until expiry.
 * - User can resume before expiry.
 *
 * immediate = true:
 * - Subscription ends immediately.
 * - Paid access is revoked.
 * - User can subscribe again.
 */
export const cancelSubscription = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        /**
         * --------------------------------------
         * AUTHENTICATION
         * --------------------------------------
         */

        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        /**
         * --------------------------------------
         * VALIDATE REQUEST BODY
         * --------------------------------------
         *
         * Only accept an actual boolean.
         * This prevents values such as:
         *
         * "true"
         * 1
         * "false"
         *
         * from being interpreted unexpectedly.
         */

        const immediate =
            req.body?.immediate === true;

        /**
         * --------------------------------------
         * CANCEL SUBSCRIPTION
         * --------------------------------------
         */

        const subscription =
            await cancelUserSubscription(
                req.userId,
                immediate
            );

        /**
         * --------------------------------------
         * CAN RESUME
         * --------------------------------------
         */

        const now = new Date();

        const canResume =
            !immediate &&
            subscription.status === "ACTIVE" &&
            subscription.cancelAtPeriodEnd ===
            true &&
            (
                !subscription.expiresAt ||
                subscription.expiresAt > now
            );

        /**
         * --------------------------------------
         * RESPONSE
         * --------------------------------------
         */

        return res.status(200).json({
            success: true,

            message: immediate
                ? "Subscription cancelled immediately. You may subscribe again at any time."
                : "Subscription will remain active until the end of your current billing period. You can resume it anytime before it expires.",

            subscription,

            canResume,
        });
    } catch (error: unknown) {
        console.error(
            "Cancel Subscription Error:",
            error instanceof Error
                ? error.message
                : "Unknown error"
        );

        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to cancel subscription.",
        });
    }
};