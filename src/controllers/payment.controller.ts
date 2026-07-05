import crypto from "crypto";
import { Request, Response } from "express";

import User from "../models/User";
import Payment, { IPayment } from "../models/Payment";

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
                message:
                    "Unsupported payment provider",
            });
        }

        if (plan === "FREE") {
            return res.status(400).json({
                message:
                    "FREE plan does not require payment",
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const planConfig =
            PLANS[
            plan as keyof typeof PLANS
            ];

        if (!planConfig) {
            return res.status(400).json({
                message: "Invalid plan",
            });
        }

        /**
 * Determine whether this is
 * an upgrade or downgrade.
 */
        const currentSubscription =
            await Subscription.findOne({
                user: req.userId,
            });

        const currentPlan =
            currentSubscription?.plan ?? "FREE";

        /**
         * Same plan
         */
        if (currentPlan === plan) {
            return res.status(400).json({
                success: false,
                message:
                    "You are already on this plan.",
            });
        }

        /**
         * Downgrades are scheduled.
         * They do NOT require payment.
         */
        if (
            entitlementService.canDowngrade(
                currentPlan,
                plan
            )
        ) {
            const subscription =
                await schedulePlanChange(
                    req.userId!,
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
         * Prevent duplicate pending payments
         */
        const existingPayment =
            await Payment.findOne({
                user: req.userId,
                provider,
                plan,
                status: "PENDING",
            });

        if (existingPayment) {
            const result =
                await paymentProvider.initializePayment({
                    email: user.email,
                    amount: planConfig.price,
                    reference:
                        existingPayment.reference,
                    callbackUrl,
                    metadata: {
                        userId: req.userId,
                        plan,
                    },
                });

            return res.status(200).json({
                success: true,
                message:
                    "Existing pending payment found.",
                provider,
                plan,
                reference:
                    existingPayment.reference,
                authorizationUrl:
                    result.authorizationUrl,
            });
        }

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

        const result =
            await paymentProvider.initializePayment({
                email: user.email,
                amount: planConfig.price,
                reference,
                callbackUrl,
                metadata: {
                    userId: req.userId,
                    plan,
                },
            });

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
        const reference = String(req.params.reference);

        const payment = await Payment.findOne({
            reference,
            user: req.userId,
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }

        const provider =
            PaymentService.getProvider(payment.provider);

        const verification =
            await provider.verifyPayment(reference);

        if (!verification.success) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed",
                verification,
            });
        }

        if (
            verification.status?.toLowerCase() !== "success"
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment not successful",
                verification,
            });
        }

        if (payment.status !== "SUCCESS") {
            payment.status = "SUCCESS";

            payment.paidAt = new Date(
                verification.paidAt ?? Date.now()
            );

            await payment.save();
        }

        /**
         * VERY IMPORTANT
         * Ensure subscription exists even if
         * webhook hasn't run yet.
         */
        const subscription =
            await applySubscriptionUpgrade(payment);

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
            message: "Failed to verify payment",
        });
    }
};

/**
 * PAYSTACK SUCCESS REDIRECT
 *
 * Used by the React Native WebView.
 * The frontend detects this URL and
 * navigates to the verification screen.
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
            PaymentService.getProvider("KORA");

        const rawBody = req.body.toString("utf8");

        const payload = await provider.parseWebhook(
            JSON.parse(rawBody),
            req.headers["x-korapay-signature"] as string
        );

        if (payload.status !== "success") {
            return res.sendStatus(200);
        }

        const exists = await WebhookEvent.findOne({
            provider: "KORA",
            reference: payload.reference,
            event: payload.status,
        });

        if (exists) return res.sendStatus(200);

        await WebhookEvent.create({
            provider: "KORA",
            reference: payload.reference,
            event: payload.status,
            payload,
            processed: false,
        });

        await addPaymentJob(
            payload.reference
        );

        return res.sendStatus(200);
    } catch (error) {
        console.error("Kora Webhook Error:", error);
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
            PaymentService.getProvider("PAYSTACK");

        const rawBody = req.body.toString("utf8");

        const payload = await provider.parseWebhook(
            JSON.parse(rawBody),
            req.headers["x-paystack-signature"] as string
        );

        if (payload.event !== "charge.success") {
            return res.sendStatus(200);
        }

        const exists = await WebhookEvent.findOne({
            provider: "PAYSTACK",
            reference: payload.reference,
            event: payload.event,
        });

        if (exists) return res.sendStatus(200);

        await WebhookEvent.create({
            provider: "PAYSTACK",
            reference: payload.reference,
            event: payload.event,
            payload,
            processed: false,
        });

        await addPaymentJob(
            payload.reference
        );

        return res.sendStatus(200);
    } catch (error) {
        console.error("Paystack Webhook Error:", error);
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
        const payments = await Payment.find({
            user: req.userId,
        })
            .sort({ createdAt: -1 })
            .select(
                "provider plan amount status paidAt createdAt reference"
            );

        return res.json({
            payments,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to fetch payment history",
        });
    }
};