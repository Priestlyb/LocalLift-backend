import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const paymentQueue = redis
    ? new Queue("payment-events", {
        connection: redis,
        defaultJobOptions: {
            attempts: 5,
            backoff: {
                type: "exponential",
                delay: 3000,
            },
            removeOnComplete: 100,
            removeOnFail: 500,
        },
    })
    : null;

if (!paymentQueue) {
    console.log(
        "Payment queue disabled (Redis not available)"
    );
}

export const addPaymentJob = async (
    reference: string
) => {
    if (!paymentQueue) {
        throw new Error(
            "Payment queue not initialized"
        );
    }

    return paymentQueue.add(
        "process-payment",
        {
            reference,
        },
        {
            jobId: reference,
        }
    );
};