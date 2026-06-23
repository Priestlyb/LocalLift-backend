import cron from "node-cron";

import Subscription from "../models/Subscription";

export const startSubscriptionJob =
    () => {
        cron.schedule(
            "0 0 * * *",
            async () => {
                try {
                    await Subscription.updateMany(
                        {
                            expiresAt: {
                                $lt: new Date(),
                            },
                            status: "ACTIVE",
                        },
                        {
                            status: "EXPIRED",
                            plan: "FREE",
                        }
                    );

                    console.log(
                        "Subscription expiry job completed"
                    );
                } catch (error) {
                    console.error(error);
                }
            }
        );
    };