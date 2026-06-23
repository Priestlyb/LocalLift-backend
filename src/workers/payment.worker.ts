import { Worker } from "bullmq";
import { redis } from "../config/redis";

import Payment from "../models/Payment";
import Subscription from "../models/Subscription";

export const paymentWorker = new Worker(
    "payment-events",
    async (job) => {
        const { reference } = job.data;

        const payment = await Payment.findOne({ reference });

        if (!payment) return;
        if (payment.status === "SUCCESS") return;

        payment.status = "SUCCESS";
        payment.paidAt = new Date();

        await payment.save();

        const existing = await Subscription.findOne({
            user: payment.user,
        });

        const now = new Date();

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
            { upsert: true, new: true }
        );
    },
    {
        connection: redis,
    }
);