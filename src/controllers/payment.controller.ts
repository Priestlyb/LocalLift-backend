import crypto from "crypto";
import { Request, Response } from "express";

import User from "../models/User";
import Payment, { IPayment } from "../models/Payment";
import Subscription from "../models/Subscription";

import { AuthRequest } from "../middleware/auth.middleware";

import { PLANS } from "../constants/plans";

import { PaymentService } from "../services/payments/payment.service";

import {
    PaymentProvider,
    PaymentPlan,
} from "../types/payment.types";

import WebhookEvent from "../models/WebhookEvent";
import { paymentQueue } from "../queues/payment.queue";

/**
 * =========================
 * INITIALIZE PAYMENT
 * =========================
 */
export const initializePayment = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const { provider, plan }: {
            provider: PaymentProvider;
            plan: PaymentPlan;
        } = req.body;

        if (!provider || !plan) {
            return res.status(400).json({
                message: "Provider and plan are required",
            });
        }

        if (!PaymentService.isSupportedProvider(provider)) {
            return res.status(400).json({
                message: "Unsupported payment provider",
            });
        }

        if (plan === "FREE") {
            return res.status(400).json({
                message: "FREE plan does not require payment",
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        const planConfig = PLANS[plan as keyof typeof PLANS];

        if (!planConfig) {
            return res.status(400).json({
                message: "Invalid plan",
            });
        }

        const reference = crypto.randomUUID();

        await Payment.create({
            user: req.userId,
            provider,
            reference,
            plan,
            amount: planConfig.price,
            status: "PENDING",
        });

        const paymentProvider = PaymentService.getProvider(provider);

        const result = await paymentProvider.initializePayment({
            email: user.email,
            amount: planConfig.price,
            reference,
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
            authorizationUrl: result.authorizationUrl,
        });
    } catch (error) {
        console.error("Initialize Payment Error:", error);

        return res.status(500).json({
            message: "Failed to initialize payment",
        });
    }
};

/**
 * =========================
 * VERIFY PAYMENT (MANUAL SYNC)
 * =========================
 */
export const verifyPayment = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const reference = String(req.params.reference);

        const payment = await Payment.findOne({ reference });

        if (!payment) {
            return res.status(404).json({
                message: "Payment not found",
            });
        }

        const provider = PaymentService.getProvider(payment.provider);

        const verification = await provider.verifyPayment(reference);

        if (verification.success && payment.status !== "SUCCESS") {
            payment.status = "SUCCESS";
            payment.paidAt = new Date(verification.paidAt || Date.now());

            await payment.save();

            await Subscription.findOneAndUpdate(
                { user: payment.user },
                {
                    plan: payment.plan,
                    status: "ACTIVE",
                    startsAt: new Date(),
                },
                { upsert: true, new: true }
            );
        }

        return res.status(200).json({
            success: true,
            payment,
            verification,
        });
    } catch (error) {
        console.error("Verify Payment Error:", error);

        return res.status(500).json({
            message: "Failed to verify payment",
        });
    }
};

/**
 * =========================
 * SUBSCRIPTION UPGRADE (SAFE + IDEMPOTENT)
 * =========================
 */
export const upgradeSubscription = async (payment: IPayment) => {
    const now = new Date();

    const existing = await Subscription.findOne({
        user: payment.user,
    });

    let startsAt = now;
    let expiresAt = new Date();

    if (existing?.expiresAt && existing.expiresAt > now) {
        startsAt = existing.startsAt || now;
        expiresAt = new Date(existing.expiresAt);
    }

    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await Subscription.findOneAndUpdate(
        { user: payment.user },
        {
            user: payment.user,
            plan: payment.plan,
            status: "ACTIVE",
            startsAt,
            expiresAt,
            lastPaymentReference: payment.reference,
            updatedAt: now,
        },
        { new: true, upsert: true }
    );
};

/**
 * =========================
 * KORA WEBHOOK
 * =========================
 */
export const koraWebhook = async (req: Request, res: Response) => {
    try {
        const provider = PaymentService.getProvider("KORA");

        const rawBody = req.body.toString("utf8");

        const payload = await provider.parseWebhook(
            JSON.parse(rawBody),
            req.headers["x-korapay-signature"] as string
        );

        if (payload.status !== "success") {
            return res.sendStatus(200);
        }

        // 🔒 1. IDEMPOTENCY CHECK (EVENT STORE)
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

        // ⚡ 2. PUSH TO QUEUE
        await paymentQueue.add(
            "process-payment",
            {
                reference: payload.reference,
            },
            {
                attempts: 5,
                backoff: { type: "exponential", delay: 2000 },
            }
        );

        return res.sendStatus(200);
    } catch (error) {
        console.error("Kora Webhook Error:", error);
        return res.sendStatus(500);
    }
};

/**
 * =========================
 * PAYSTACK WEBHOOK
 * =========================
 */
export const paystackWebhook = async (req: Request, res: Response) => {
    try {
        const provider = PaymentService.getProvider("PAYSTACK");

        const rawBody = req.body.toString("utf8");

        const payload = await provider.parseWebhook(
            JSON.parse(rawBody),
            req.headers["x-paystack-signature"] as string
        );

        if (payload.event !== "charge.success") {
            return res.sendStatus(200);
        }

        // 🔒 EVENT STORE CHECK
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

        // ⚡ PUSH TO QUEUE
        await paymentQueue.add(
            "process-payment",
            {
                reference: payload.reference,
            },
            {
                attempts: 5,
                backoff: { type: "exponential", delay: 2000 },
            }
        );

        return res.sendStatus(200);
    } catch (error) {
        console.error("Paystack Webhook Error:", error);
        return res.sendStatus(500);
    }
};

/**
 * =========================
 * PAYMENT HISTORY
 * =========================
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