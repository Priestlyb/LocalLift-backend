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

    if (subscription.status !== "ACTIVE") {
        throw new Error(
            "Subscription is not active"
        );
    }

    // Don't allow plan changes once cancellation
    // has already been scheduled.
    if (subscription.cancelAtPeriodEnd) {
        throw new Error(
            "Resume your subscription before changing plans."
        );
    }

    if (subscription.plan === nextPlan) {
        throw new Error(
            "Already subscribed to this plan"
        );
    }

    if (
        PLAN_ORDER[nextPlan] >
        PLAN_ORDER[subscription.plan]
    ) {
        throw new Error(
            "Upgrades must be processed through payment"
        );
    }

    subscription.nextPlan = nextPlan;
    subscription.changeAtRenewal = true;

    await subscription.save();

    console.log(
        `[SUBSCRIPTION] ${userId} scheduled change from ${subscription.plan} to ${nextPlan}`
    );

    return subscription;
};

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