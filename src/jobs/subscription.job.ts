import cron from "node-cron";

import { expireSubscriptions } from "../services/subscription/expireSubscriptions";

/**
 * Runs every day at midnight.
 *
 * Responsibilities:
 * - Expire subscriptions whose billing period has ended.
 * - Apply any scheduled plan downgrades.
 * - Reset expired users to the FREE plan.
 */
export const startSubscriptionJob = () => {
    cron.schedule("0 0 * * *", async () => {
        try {
            const result =
                await expireSubscriptions();

            console.log(
                "[CRON] Subscription expiry completed",
                result
            );
        } catch (error) {
            console.error(
                "[CRON] Subscription expiry failed",
                error
            );
        }
    });
};