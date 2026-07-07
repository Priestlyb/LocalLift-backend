import Subscription from "../../models/Subscription";

/**
 * Cancels a user's subscription.
 *
 * immediate = false
 * -----------------
 * - Keeps the subscription ACTIVE.
 * - Access continues until expiresAt.
 * - Auto-renew is disabled.
 * - Subscription may be resumed before expiry.
 *
 * immediate = true
 * ----------------
 * - Ends the subscription immediately.
 * - Access is revoked immediately.
 * - User may subscribe again at any time.
 */
export const cancelSubscription = async (
    userId: string,
    immediate = false
) => {
    const subscription = await Subscription.findOne({
        user: userId,
    });

    if (!subscription) {
        throw new Error("Subscription not found");
    }

    /**
     * Already fully cancelled.
     */
    if (
        immediate &&
        subscription.status === "CANCELLED"
    ) {
        return subscription;
    }

    /**
     * Immediate cancellation.
     */
    if (immediate) {
        const now = new Date();

        subscription.status = "CANCELLED";

        subscription.cancelledAt = now;

        subscription.cancelAtPeriodEnd = false;

        subscription.autoRenew = false;

        subscription.expiresAt = now;

        subscription.nextPlan = "FREE";

        subscription.changeAtRenewal = false;

        await subscription.save();

        console.log(
            `[SUBSCRIPTION] Immediately cancelled for ${userId}`
        );

        return subscription;
    }

    /**
     * Already scheduled.
     */
    if (subscription.cancelAtPeriodEnd) {
        return subscription;
    }

    /**
     * Schedule cancellation.
     *
     * User keeps access until expiresAt.
     */
    subscription.cancelAtPeriodEnd = true;

    subscription.autoRenew = false;

    subscription.cancelledAt = new Date();

    /**
     * When the billing period ends,
     * move the user to FREE.
     */
    subscription.nextPlan = "FREE";

    subscription.changeAtRenewal = true;

    await subscription.save();

    console.log(
        `[SUBSCRIPTION] Cancellation scheduled for ${userId}`
    );

    return subscription;
};

/**
 * Resumes a scheduled cancellation.
 *
 * Only works while the subscription
 * is still ACTIVE.
 */
export const resumeSubscription = async (
    userId: string
) => {
    const subscription = await Subscription.findOne({
        user: userId,
    });

    if (!subscription) {
        throw new Error("Subscription not found");
    }

    if (subscription.status !== "ACTIVE") {
        throw new Error(
            "Subscription is no longer active."
        );
    }

    if (!subscription.cancelAtPeriodEnd) {
        throw new Error(
            "Subscription is not scheduled for cancellation."
        );
    }

    subscription.cancelAtPeriodEnd = false;

    subscription.autoRenew = true;

    subscription.cancelledAt = null;

    subscription.nextPlan = null;

    subscription.changeAtRenewal = false;

    await subscription.save();

    console.log(
        `[SUBSCRIPTION] Resumed subscription for ${userId}`
    );

    return subscription;
};