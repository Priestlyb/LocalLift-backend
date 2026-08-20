import Subscription, {
    SubscriptionPlan,
} from "../../models/Subscription";

import { IPayment } from "../../models/Payment";

import entitlementService from "./entitlement.service";

const PLAN_ORDER: Record<
    SubscriptionPlan,
    number
> = {
    FREE: 0,
    STARTER: 1,
    GROWTH: 2,
    PRO: 3,
};

const addMonths = (
    date: Date,
    months: number
): Date => {
    const result = new Date(date);

    result.setMonth(
        result.getMonth() + months
    );

    return result;
};

const isUpgrade = (
    current: SubscriptionPlan,
    incoming: SubscriptionPlan
) => {
    return (
        PLAN_ORDER[incoming] >
        PLAN_ORDER[current]
    );
};

/**
 * Applies a successful payment to a user's
 * subscription.
 *
 * Handles:
 *
 * - First subscription
 * - Renewal of active same plan
 * - Renewal of expired same plan
 * - Immediate upgrades
 * - Reactivation after cancellation
 * - Duplicate payment protection
 * - Clears scheduled downgrades
 */
export const applySubscriptionUpgrade = async (
    payment: IPayment
) => {
    const now = new Date();

    /**
     * Validate plan.
     */
    if (
        !entitlementService.isValidPlan(
            payment.plan
        )
    ) {
        throw new Error(
            `Invalid subscription plan: ${payment.plan}`
        );
    }

    const durationMonths =
        entitlementService.getDurationMonths(
            payment.plan
        );

    /**
     * Find existing subscription.
     */
    const existing =
        await Subscription.findOne({
            user: payment.user,
        });

    /**
     * ---------------------------------------
     * DUPLICATE PAYMENT PROTECTION
     * ---------------------------------------
     */
    if (
        existing?.lastPaymentReference ===
        payment.reference
    ) {
        console.log(
            `[SUBSCRIPTION] Duplicate payment ignored: ${payment.reference}`
        );

        return existing;
    }

    /**
     * ---------------------------------------
     * FIRST SUBSCRIPTION
     * ---------------------------------------
     */
    if (!existing) {
        const subscription =
            await Subscription.create({
                user: payment.user,

                plan: payment.plan,

                nextPlan: null,

                changeAtRenewal: false,

                status: "ACTIVE",

                startsAt: now,

                expiresAt: addMonths(
                    now,
                    durationMonths
                ),

                durationMonths,

                autoRenew: true,

                cancelledAt: null,

                cancelAtPeriodEnd: false,

                lastPaymentReference:
                    payment.reference,
            });

        console.log(
            `[SUBSCRIPTION] Created ${payment.plan} subscription for ${payment.user}`
        );

        return subscription;
    }

    /**
     * ---------------------------------------
     * EXISTING SUBSCRIPTION
     * ---------------------------------------
     */
    const subscription = existing;

    const isActive =
        subscription.status === "ACTIVE" &&
        (
            !subscription.expiresAt ||
            subscription.expiresAt > now
        );

    /**
     * ---------------------------------------
     * EXPIRED SUBSCRIPTION
     * ---------------------------------------
     *
     * The old plan remains in the database,
     * but purchasing the same plan again
     * reactivates it as a new billing period.
     */
    if (!isActive) {
        subscription.plan = payment.plan;

        subscription.status = "ACTIVE";

        subscription.startsAt = now;

        subscription.expiresAt = addMonths(
            now,
            durationMonths
        );

        subscription.durationMonths =
            durationMonths;

        subscription.cancelledAt = null;

        subscription.cancelAtPeriodEnd =
            false;

        subscription.autoRenew = true;

        subscription.nextPlan = null;

        subscription.changeAtRenewal = false;

        subscription.lastPaymentReference =
            payment.reference;

        await subscription.save();

        console.log(
            `[SUBSCRIPTION] Reactivated ${payment.plan} for ${payment.user} until ${subscription.expiresAt?.toISOString()}`
        );

        return subscription;
    }

    /**
     * ---------------------------------------
     * ACTIVE SAME-PLAN RENEWAL
     * ---------------------------------------
     */
    if (
        subscription.plan === payment.plan
    ) {
        const currentExpiry =
            subscription.expiresAt ?? now;

        subscription.expiresAt = addMonths(
            currentExpiry,
            durationMonths
        );

        subscription.durationMonths =
            durationMonths;

        subscription.status = "ACTIVE";

        subscription.cancelledAt = null;

        subscription.cancelAtPeriodEnd =
            false;

        subscription.autoRenew = true;

        subscription.lastPaymentReference =
            payment.reference;

        /**
         * Clear scheduled downgrade.
         */
        subscription.nextPlan = null;

        subscription.changeAtRenewal = false;

        await subscription.save();

        console.log(
            `[SUBSCRIPTION] Renewed ${payment.plan} until ${subscription.expiresAt?.toISOString()}`
        );

        return subscription;
    }

    /**
     * ---------------------------------------
     * ACTIVE UPGRADE
     * ---------------------------------------
     */
    if (
        isUpgrade(
            subscription.plan,
            payment.plan
        )
    ) {
        subscription.plan = payment.plan;

        subscription.status = "ACTIVE";

        subscription.durationMonths =
            durationMonths;

        subscription.cancelledAt = null;

        subscription.cancelAtPeriodEnd =
            false;

        subscription.autoRenew = true;

        subscription.lastPaymentReference =
            payment.reference;

        /**
         * Keep the existing expiration date
         * for the upgrade.
         *
         * If you want upgrades to add time,
         * this can be changed later.
         */
        subscription.expiresAt =
            subscription.expiresAt;

        /**
         * Upgrade overrides scheduled
         * downgrade.
         */
        subscription.nextPlan = null;

        subscription.changeAtRenewal = false;

        await subscription.save();

        console.log(
            `[SUBSCRIPTION] Upgraded ${payment.user} to ${payment.plan}`
        );

        return subscription;
    }

    /**
     * ---------------------------------------
     * FALLBACK
     * ---------------------------------------
     *
     * This handles any remaining valid
     * subscription transition.
     */
    subscription.plan = payment.plan;

    subscription.status = "ACTIVE";

    subscription.startsAt = now;

    subscription.expiresAt = addMonths(
        now,
        durationMonths
    );

    subscription.durationMonths =
        durationMonths;

    subscription.cancelledAt = null;

    subscription.cancelAtPeriodEnd = false;

    subscription.autoRenew = true;

    subscription.lastPaymentReference =
        payment.reference;

    subscription.nextPlan = null;

    subscription.changeAtRenewal = false;

    await subscription.save();

    console.log(
        `[SUBSCRIPTION] Activated ${payment.plan} for ${payment.user}`
    );

    return subscription;
};