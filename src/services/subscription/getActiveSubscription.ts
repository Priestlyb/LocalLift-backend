import Subscription from "../../models/Subscription";

/**
 * Returns the user's current active subscription.
 *
 * If the subscription has already expired,
 * it is automatically marked as EXPIRED.
 */
export const getActiveSubscription = async (
    userId: string
) => {
    const subscription = await Subscription.findOne({
        user: userId,
    });

    if (!subscription) {
        return null;
    }

    /**
     * Automatically expire stale subscriptions.
     */
    if (
        subscription.status === "ACTIVE" &&
        subscription.expiresAt &&
        subscription.expiresAt <= new Date()
    ) {
        subscription.status = "EXPIRED";

        await subscription.save();

        return null;
    }

    if (subscription.status !== "ACTIVE") {
        return null;
    }

    return subscription;
};

/**
 * Returns whether the user currently has
 * an active paid subscription.
 */
export const hasActiveSubscription = async (
    userId: string
): Promise<boolean> => {
    const subscription =
        await getActiveSubscription(userId);

    return subscription !== null;
};

/**
 * Returns the user's subscription,
 * regardless of status.
 */
export const getSubscription = async (
    userId: string
) => {
    return Subscription.findOne({
        user: userId,
    });
};