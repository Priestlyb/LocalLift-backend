import Subscription from "../../models/Subscription";
import entitlementService from "./entitlement.service";

/**
 * Expires subscriptions and applies any
 * scheduled plan changes.
 *
 * Intended to run from a cron job.
 */
export const expireSubscriptions = async () => {
    const now = new Date();

    const subscriptions = await Subscription.find({
        status: "ACTIVE",
        expiresAt: {
            $lte: now,
        },
    });

    let expired = 0;

    let downgraded = 0;

    for (const subscription of subscriptions) {
        /**
         * Apply scheduled downgrade.
         */
        if (
            subscription.changeAtRenewal &&
            subscription.nextPlan
        ) {
            const durationMonths =
                entitlementService.getDurationMonths(
                    subscription.nextPlan
                );

            /**
             * FREE plan becomes expired with
             * no expiry date.
             */
            if (subscription.nextPlan === "FREE") {
                subscription.plan = "FREE";

                subscription.status = "EXPIRED";

                subscription.startsAt = now;

                subscription.expiresAt = null;

                subscription.durationMonths = 0;
            } else {
                subscription.plan =
                    subscription.nextPlan;

                subscription.status = "ACTIVE";

                subscription.startsAt = now;

                subscription.durationMonths =
                    durationMonths;

                subscription.expiresAt = new Date(now);

                subscription.expiresAt.setMonth(
                    subscription.expiresAt.getMonth() +
                    durationMonths
                );
            }

            subscription.nextPlan = null;

            subscription.changeAtRenewal = false;

            subscription.lastPaymentReference =
                null;

            await subscription.save();

            downgraded++;

            console.log(
                `[SUBSCRIPTION] Applied scheduled change for ${subscription.user} → ${subscription.plan}`
            );

            continue;
        }

        /**
         * No scheduled change.
         * Subscription simply expires.
         */
        subscription.status = "EXPIRED";

        await subscription.save();

        expired++;

        console.log(
            `[SUBSCRIPTION] Expired subscription for ${subscription.user}`
        );
    }

    return {
        processed: subscriptions.length,
        expired,
        downgraded,
    };
};