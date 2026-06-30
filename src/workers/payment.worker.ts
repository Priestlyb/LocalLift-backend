import Payment from "../models/Payment";
import WebhookEvent from "../models/WebhookEvent";

import { PaymentService } from "../services/payment/payment.service";
import { applySubscriptionUpgrade } from "../services/subscription/subscription.service";

export const processPaymentJob = async (job: any) => {
    const { reference } = job.data;

    console.log(
        `[PAYMENT JOB] Processing payment ${reference}`
    );

    try {
        const payment = await Payment.findOne({
            reference,
        });

        if (!payment) {
            console.log(
                `[PAYMENT JOB] Payment not found: ${reference}`
            );

            return;
        }

        const webhookEvent =
            await WebhookEvent.findOne({
                provider: payment.provider,
                reference,
                processed: false,
            });

        if (!webhookEvent) {
            console.log(
                `[PAYMENT JOB] Already processed: ${reference}`
            );

            return;
        }

        
        
        const provider =
            PaymentService.getProvider(
                payment.provider
            );

        const verification =
            await provider.verifyPayment(
                reference
            );

        if (!verification.success) {
            console.log(
                `[PAYMENT JOB] Verification failed: ${reference}`
            );

            return;
        }

        
        
        if (
            verification.status &&
            verification.status
                .toLowerCase()
                .trim() !== "success"
        ) {
            console.log(
                `[PAYMENT JOB] Payment not successful: ${reference}`
            );

            return;
        }

        
        payment.status = "SUCCESS";

        payment.paidAt = new Date(
            verification.paidAt ||
            Date.now()
        );

        await payment.save();

        console.log(
            `[PAYMENT JOB] Payment marked SUCCESS: ${reference}`
        );

        
        await applySubscriptionUpgrade(
            payment
        );

        console.log(
            `[PAYMENT JOB] Subscription upgraded: ${reference}`
        );

        webhookEvent.processed = true;

        await webhookEvent.save();

        console.log(
            `[PAYMENT JOB] Completed: ${reference}`
        );
    } catch (error) {
        console.error(
            `[PAYMENT JOB] Failed: ${reference}`,
            error
        );
        throw error;
    }
};