import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const paymentQueue = new Queue("payment-events", {
    connection: redis,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: "exponential",
            delay: 3000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});