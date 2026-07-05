import Subscription from "../../models/Subscription";

/**
 * Cancels a user's subscription.
 *
 * By default, cancellation happens at the
 * end of the current billing period by
 * disabling auto-renew.
 *
 * If immediate is true, access is revoked
 * immediately.
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
     * Already cancelled.
     */
    if (
        subscription.status === "CANCELLED" &&
        immediate
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
     * End-of-period cancellation.
     *
     * User keeps access until expiresAt.
     */
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