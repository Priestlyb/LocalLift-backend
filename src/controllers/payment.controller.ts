import crypto from "crypto";
import { Request, Response } from "express";

import User from "../models/User";
import Payment from "../models/Payment";

import { AuthRequest } from "../middleware/auth.middleware";
import { PLANS } from "../constants/plans";

import { PaymentService } from "../services/payment/payment.service";

import {
    PaymentProvider,
    PaymentPlan,
} from "../types/payment.types";

import WebhookEvent from "../models/WebhookEvent";
import { addPaymentJob } from "../queues/payment.queue";

import entitlementService from "../services/subscription/entitlement.service";

import Subscription from "../models/Subscription";

import { applySubscriptionUpgrade } from "../services/subscription/applySubscriptionUpgrade";
import { schedulePlanChange } from "../services/subscription/schedulePlanChange";

/**
 * INITIALIZE PAYMENT
 *
 * Handles:
 *
 * ACTIVE subscription
 *  - Upgrade -> payment required
 *  - Same plan -> rejected
 *  - Downgrade -> scheduled
 *
 * EXPIRED / CANCELLED subscription
 *  - Same plan -> allowed (renewal)
 *  - Different plan -> allowed (new subscription)
 *
 * FREE subscription
 *  - Any paid plan -> payment required
 */
/**
 * INITIALIZE PAYMENT
 */
export const initializePayment = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const {
            provider,
            plan,
        }: {
            provider: PaymentProvider;
            plan: PaymentPlan;
        } = req.body;

        if (!provider || !plan) {
            return res.status(400).json({
                success: false,
                message:
                    "Provider and plan are required",
            });
        }

        if (
            !PaymentService.isSupportedProvider(
                provider
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Unsupported payment provider",
            });
        }

        if (plan === "FREE") {
            return res.status(400).json({
                success: false,
                message:
                    "FREE plan does not require payment",
            });
        }

        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const user = await User.findById(
            req.userId
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const planConfig =
            PLANS[
            plan as keyof typeof PLANS
            ];

        if (!planConfig) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan",
            });
        }

        /**
         * ---------------------------------------
         * GET CURRENT SUBSCRIPTION
         * ---------------------------------------
         */
        const currentSubscription =
            await Subscription.findOne({
                user: req.userId,
            });

        /**
         * Determine whether the existing
         * subscription is actually active.
         *
         * An EXPIRED subscription should be
         * treated as FREE for purchasing.
         */
        const now = new Date();

        const isCurrentlyActive =
            currentSubscription?.status ===
            "ACTIVE" &&
            (
                !currentSubscription.expiresAt ||
                currentSubscription.expiresAt > now
            );

        /**
         * If the subscription is marked ACTIVE
         * but the expiration date has passed,
         * immediately mark it as EXPIRED.
         */
        if (
            currentSubscription &&
            currentSubscription.status ===
            "ACTIVE" &&
            currentSubscription.expiresAt &&
            currentSubscription.expiresAt <= now
        ) {
            currentSubscription.status =
                "EXPIRED";

            currentSubscription.cancelAtPeriodEnd =
                false;

            currentSubscription.autoRenew =
                false;

            await currentSubscription.save();

            console.log(
                `[SUBSCRIPTION] Expired subscription ${currentSubscription._id}`
            );
        }

        /**
         * ---------------------------------------
         * DETERMINE EFFECTIVE CURRENT PLAN
         * ---------------------------------------
         *
         * Only an actually active subscription
         * counts as the user's current plan.
         *
         * EXPIRED / CANCELLED / PAST_DUE
         * subscriptions are treated as FREE.
         */
        const currentPlan: PaymentPlan =
            isCurrentlyActive &&
                currentSubscription
                ? currentSubscription.plan
                : "FREE";

        console.log(
            "[SUBSCRIPTION] Payment initialization:",
            {
                userId: req.userId,
                requestedPlan: plan,
                storedPlan:
                    currentSubscription?.plan,
                storedStatus:
                    currentSubscription?.status,
                effectiveCurrentPlan:
                    currentPlan,
                isCurrentlyActive,
            }
        );

        /**
         * ---------------------------------------
         * SAME PLAN
         * ---------------------------------------
         *
         * Only prevent payment if the user is
         * ACTUALLY ACTIVE on that plan.
         *
         * This allows:
         *
         * GROWTH ACTIVE -> GROWTH
         * ❌ blocked
         *
         * GROWTH EXPIRED -> GROWTH
         * ✅ renewal allowed
         */
        if (
            isCurrentlyActive &&
            currentPlan === plan
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "You are already on this plan.",
            });
        }

        /**
         * ---------------------------------------
         * DOWNGRADE
         * ---------------------------------------
         *
         * Only schedule downgrades when the
         * current subscription is actually active.
         *
         * An expired subscription should be
         * treated as a fresh purchase instead.
         */
        if (
            isCurrentlyActive &&
            entitlementService.canDowngrade(
                currentPlan,
                plan
            )
        ) {
            const subscription =
                await schedulePlanChange(
                    req.userId,
                    plan
                );

            return res.status(200).json({
                success: true,
                scheduled: true,
                subscription,
                message:
                    `Your plan will change to ${plan} when your current subscription ends.`,
            });
        }

        /**
         * ---------------------------------------
         * PAYMENT CALLBACK
         * ---------------------------------------
         */
        const callbackUrl =
            process.env.PAYMENT_CALLBACK_URL;

        console.log(
            "PAYMENT_CALLBACK_URL:",
            callbackUrl
        );

        const paymentProvider =
            PaymentService.getProvider(
                provider
            );

        /**
         * ---------------------------------------
         * CANCEL EXISTING PENDING PAYMENT
         * ---------------------------------------
         */
        const existingPayment =
            await Payment.findOne({
                user: req.userId,
                provider,
                plan,
                status: "PENDING",
            });

        if (existingPayment) {
            console.log(
                "Cancelling stale payment:",
                existingPayment.reference
            );

            existingPayment.status = "FAILED";

            await existingPayment.save();
        }

        /**
         * ---------------------------------------
         * CREATE PAYMENT
         * ---------------------------------------
         */
        const reference =
            crypto.randomUUID();

        await Payment.create({
            user: req.userId,
            provider,
            reference,
            plan,
            amount: planConfig.price,
            status: "PENDING",
        });

        /**
         * ---------------------------------------
         * INITIALIZE PROVIDER PAYMENT
         * ---------------------------------------
         */
        const result =
            await paymentProvider.initializePayment(
                {
                    email: user.email,
                    amount: planConfig.price,
                    reference,
                    callbackUrl,
                    metadata: {
                        userId: req.userId,
                        plan,
                    },
                }
            );

        return res.status(200).json({
            success: true,
            provider,
            plan,
            reference,
            authorizationUrl:
                result.authorizationUrl,
        });
    } catch (error) {
        console.error(
            "Initialize Payment Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to initialize payment",
        });
    }
};

/**
 * VERIFY PAYMENT
 */
export const verifyPayment = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const reference = String(
            req.params.reference
        );

        /**
         * Find payment belonging to
         * the authenticated user.
         */
        const payment =
            await Payment.findOne({
                reference,
                user: req.userId,
            });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }

        /**
         * Get provider.
         */
        const provider =
            PaymentService.getProvider(
                payment.provider
            );

        /**
         * Verify payment with provider.
         */
        const verification =
            await provider.verifyPayment(
                reference
            );

        if (!verification.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment verification failed",
                verification,
            });
        }

        /**
         * Make sure payment was actually successful.
         */
        if (
            verification.status?.toLowerCase() !==
            "success"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment not successful",
                verification,
            });
        }

        /**
         * Mark payment as successful.
         */
        if (payment.status !== "SUCCESS") {
            payment.status = "SUCCESS";

            payment.paidAt = new Date(
                verification.paidAt ??
                Date.now()
            );

            await payment.save();
        }

        /**
         * Apply the subscription.
         *
         * This handles both:
         *
         * - New subscriptions
         * - Renewals
         * - Upgrades
         */
        const subscription =
            await applySubscriptionUpgrade(
                payment
            );

        return res.status(200).json({
            success: true,
            payment,
            subscription,
            verification,
        });
    } catch (error) {
        console.error(
            "Verify Payment Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to verify payment",
        });
    }
};

/**
 * PAYSTACK SUCCESS REDIRECT
 *
 * Used by the React Native WebView.
 */
export const paymentSuccess = async (
    req: Request,
    res: Response
) => {
    return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
    <title>Payment Successful</title>
    <meta charset="utf-8" />
</head>
<body style="
    font-family: Arial, sans-serif;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    background:#F8FAFC;
">
    <div style="text-align:center;">
        <h2>Payment Successful</h2>
        <p>Returning to LocalLift...</p>
    </div>
</body>
</html>
`);
};

/**
 * PAYSTACK FAILED REDIRECT
 */
export const paymentFailed = async (
    req: Request,
    res: Response
) => {
    return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
    <title>Payment Failed</title>
    <meta charset="utf-8" />
</head>
<body style="
    font-family: Arial, sans-serif;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    background:#F8FAFC;
">
    <div style="text-align:center;">
        <h2>Payment Failed</h2>
        <p>You can close this page and return to the app.</p>
    </div>
</body>
</html>
`);
};

/**
 * KORA WEBHOOK
 */
export const koraWebhook = async (
    req: Request,
    res: Response
) => {
    try {
        const provider =
            PaymentService.getProvider(
                "KORA"
            );

        const rawBody =
            req.body.toString("utf8");

        const payload =
            await provider.parseWebhook(
                JSON.parse(rawBody),
                req.headers[
                "x-korapay-signature"
                ] as string
            );

        if (
            payload.status !== "success"
        ) {
            return res.sendStatus(200);
        }

        const exists =
            await WebhookEvent.findOne({
                provider: "KORA",
                reference:
                    payload.reference,
                event: payload.status,
            });

        if (exists) {
            return res.sendStatus(200);
        }

        await WebhookEvent.create({
            provider: "KORA",
            reference:
                payload.reference,
            event: payload.status,
            payload,
            processed: false,
        });

        await addPaymentJob(
            payload.reference
        );

        return res.sendStatus(200);
    } catch (error) {
        console.error(
            "Kora Webhook Error:",
            error
        );

        return res.sendStatus(500);
    }
};

/**
 * PAYSTACK WEBHOOK
 */
export const paystackWebhook = async (
    req: Request,
    res: Response
) => {
    try {
        const provider =
            PaymentService.getProvider(
                "PAYSTACK"
            );

        const rawBody =
            req.body.toString("utf8");

        const payload =
            await provider.parseWebhook(
                JSON.parse(rawBody),
                req.headers[
                "x-paystack-signature"
                ] as string
            );

        if (
            payload.event !==
            "charge.success"
        ) {
            return res.sendStatus(200);
        }

        const exists =
            await WebhookEvent.findOne({
                provider: "PAYSTACK",
                reference:
                    payload.reference,
                event: payload.event,
            });

        if (exists) {
            return res.sendStatus(200);
        }

        await WebhookEvent.create({
            provider: "PAYSTACK",
            reference:
                payload.reference,
            event: payload.event,
            payload,
            processed: false,
        });

        await addPaymentJob(
            payload.reference
        );

        return res.sendStatus(200);
    } catch (error) {
        console.error(
            "Paystack Webhook Error:",
            error
        );

        return res.sendStatus(500);
    }
};

/**
 * PAYMENT HISTORY
 */
export const getPaymentHistory = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const payments =
            await Payment.find({
                user: req.userId,
            })
                .sort({
                    createdAt: -1,
                })
                .select(
                    "provider plan amount status paidAt createdAt reference"
                );

        return res.json({
            payments,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message:
                "Failed to fetch payment history",
        });
    }
};