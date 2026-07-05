import Subscription, {
    SubscriptionPlan,
} from "../../models/Subscription";
import entitlementService from "./entitlement.service";

const PLAN_ORDER: Record<SubscriptionPlan, number> = {
    FREE: 0,
    STARTER: 1,
    GROWTH: 2,
    PRO: 3,
};

/**
 * Schedules a plan change to occur at the
 * end of the current billing cycle.
 *
 * Upgrades should NOT use this service.
 * They should be handled immediately after
 * successful payment via applySubscriptionUpgrade().
 */
export const schedulePlanChange = async (
    userId: string,
    nextPlan: SubscriptionPlan
) => {
    if (
        !entitlementService.isValidPlan(nextPlan)
    ) {
        throw new Error("Invalid subscription plan");
    }

    const subscription =
        await Subscription.findOne({
            user: userId,
        });

    if (!subscription) {
        throw new Error(
            "Subscription not found"
        );
    }

    /**
     * Cannot schedule a change on an
     * inactive subscription.
     */
    if (subscription.status !== "ACTIVE") {
        throw new Error(
            "Subscription is not active"
        );
    }

    /**
     * Already on this plan.
     */
    if (subscription.plan === nextPlan) {
        throw new Error(
            "Already subscribed to this plan"
        );
    }

    /**
     * Prevent using this for upgrades.
     * Upgrades should happen immediately
     * after payment verification.
     */
    if (
        PLAN_ORDER[nextPlan] >
        PLAN_ORDER[subscription.plan]
    ) {
        throw new Error(
            "Upgrades must be processed through payment"
        );
    }

    /**
     * Replace any previously scheduled
     * downgrade.
     */
    subscription.nextPlan = nextPlan;

    subscription.changeAtRenewal = true;

    await subscription.save();

    console.log(
        `[SUBSCRIPTION] ${userId} scheduled change from ${subscription.plan} to ${nextPlan}`
    );

    return subscription;
};

/**
 * Removes any scheduled plan change.
 */
export const cancelScheduledPlanChange =
    async (userId: string) => {
        const subscription =
            await Subscription.findOne({
                user: userId,
            });

        if (!subscription) {
            throw new Error(
                "Subscription not found"
            );
        }

        subscription.nextPlan = null;

        subscription.changeAtRenewal = false;

        await subscription.save();

        console.log(
            `[SUBSCRIPTION] Removed scheduled plan change for ${userId}`
        );

        return subscription;
    };

/**
 * Returns the currently scheduled
 * plan change, if one exists.
 */
export const getScheduledPlanChange =
    async (userId: string) => {
        const subscription =
            await Subscription.findOne({
                user: userId,
            });

        if (!subscription) {
            return null;
        }

        if (
            !subscription.changeAtRenewal ||
            !subscription.nextPlan
        ) {
            return null;
        }

        return {
            currentPlan: subscription.plan,
            nextPlan: subscription.nextPlan,
            effectiveDate:
                subscription.expiresAt,
        };
    };