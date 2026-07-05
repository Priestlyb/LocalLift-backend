import Subscription, {
    SubscriptionPlan,
} from "../../models/Subscription";
import { IPayment } from "../../models/Payment";
import entitlementService from "./entitlement.service";

const PLAN_ORDER: Record<SubscriptionPlan, number> = {
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

    result.setMonth(result.getMonth() + months);

    return result;
};

const isUpgrade = (
    current: SubscriptionPlan,
    incoming: SubscriptionPlan
) => {
    return PLAN_ORDER[incoming] > PLAN_ORDER[current];
};

/**
 * Applies a successful payment to a user's subscription.
 *
 * Handles:
 * - First subscription
 * - Renewal of the same plan
 * - Immediate upgrades
 * - Duplicate payment protection
 * - Clears scheduled downgrades after upgrade
 */
export const applySubscriptionUpgrade = async (
    payment: IPayment
) => {
    const now = new Date();

    if (
        !entitlementService.isValidPlan(payment.plan)
    ) {
        throw new Error(
            `Invalid subscription plan: ${payment.plan}`
        );
    }

    const durationMonths =
        entitlementService.getDurationMonths(
            payment.plan
        );

    const existing =
        await Subscription.findOne({
            user: payment.user,
        });

    /**
     * Prevent duplicate processing
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
     * ACTIVE SUBSCRIPTION
     * ---------------------------------------
     */

    const subscription = existing;

    const active =
        subscription.expiresAt &&
        subscription.expiresAt > now;

    /**
     * Same plan purchased again.
     * Extend expiry.
     */
    if (
        active &&
        subscription.plan === payment.plan
    ) {
        const currentExpiry = subscription.expiresAt!;

        subscription.expiresAt = addMonths(
            currentExpiry,
            durationMonths
        );

        subscription.durationMonths =
            durationMonths;

        subscription.status = "ACTIVE";

        subscription.cancelledAt = null;

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
            `[SUBSCRIPTION] Renewed ${payment.plan} until ${subscription.expiresAt.toISOString()}`
        );

        return subscription;
    }

    /**
     * Immediate upgrade.
     */
    if (
        active &&
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

        subscription.autoRenew = true;

        subscription.lastPaymentReference =
            payment.reference;

        /**
         * Keep current billing cycle,
         * then extend by purchased duration.
         */
        subscription.expiresAt

        /**
         * Upgrade overrides any scheduled downgrade.
         */
        subscription.nextPlan = null;

        subscription.changeAtRenewal = false;

        await subscription.save();

        console.log(
            `[SUBSCRIPTION] Upgraded ${payment.user} to ${payment.plan}`
        );

        return subscription;
    }

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