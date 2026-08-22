import mongoose from "mongoose";

import Subscription, {
    SubscriptionPlan,
} from "../../models/Subscription";

import entitlementService from "./entitlement.service";

/**
 * ==========================================
 * TYPES
 * ==========================================
 */

type SchedulePlanChangeResult = {
    currentPlan: SubscriptionPlan;
    nextPlan: SubscriptionPlan;
    effectiveDate: Date | null;
};

/**
 * ==========================================
 * HELPERS
 * ==========================================
 */

/**
 * Validate a MongoDB user ID before using it
 * in a database query.
 */
const assertValidUserId: (
    userId: string
) => void = (
    userId: string
): void => {
        if (
            typeof userId !== "string" ||
            !userId.trim()
        ) {
            throw new Error(
                "A valid user ID is required."
            );
        }

        if (
            !mongoose.Types.ObjectId.isValid(
                userId
            )
        ) {
            throw new Error(
                "Invalid user ID."
            );
        }
    };

/**
 * Validate a subscription plan.
 *
 * Explicitly typing the assertion function is
 * important because TypeScript requires an
 * explicit annotation when using assertion
 * signatures on inferred variables.
 */
const assertValidPlan: (
    plan: string
) => asserts plan is SubscriptionPlan = (
    plan: string
): asserts plan is SubscriptionPlan => {
        if (
            !entitlementService.isValidPlan(
                plan
            )
        ) {
            throw new Error(
                "Invalid subscription plan."
            );
        }
    };

/**
 * Get the numeric rank of a subscription plan.
 *
 * The entitlement service is the single source
 * of truth for the plan hierarchy.
 */
const getPlanRank = (
    plan: SubscriptionPlan
): number => {
    const rank =
        entitlementService.getPlanRank(
            plan
        );

    if (rank < 0) {
        throw new Error(
            `Invalid subscription plan: ${plan}`
        );
    }

    return rank;
};

/**
 * Determine whether a subscription is genuinely
 * active at the current point in time.
 *
 * A subscription marked ACTIVE but whose
 * expiration date has passed is not considered
 * active.
 */
const isSubscriptionCurrentlyActive = (
    subscription: {
        status: string;
        expiresAt?: Date | null;
    },
    now: Date
): boolean => {
    if (
        subscription.status !==
        "ACTIVE"
    ) {
        return false;
    }

    /**
     * A subscription without an expiration date
     * is considered active.
     */
    if (!subscription.expiresAt) {
        return true;
    }

    return (
        subscription.expiresAt > now
    );
};

/**
 * ==========================================
 * SCHEDULE PLAN CHANGE
 * ==========================================
 *
 * Schedules a downgrade to happen when the
 * current subscription period ends.
 *
 * Rules:
 *
 * - Upgrades must go through payment.
 * - Downgrades can be scheduled.
 * - Expired subscriptions cannot schedule
 *   plan changes.
 * - Cancelled-at-period-end subscriptions
 *   cannot schedule another change.
 * - Only one scheduled plan change is allowed.
 */
export const schedulePlanChange = async (
    userId: string,
    nextPlan: SubscriptionPlan
) => {
    /**
     * ---------------------------------------
     * INPUT VALIDATION
     * ---------------------------------------
     */

    assertValidUserId(userId);

    assertValidPlan(nextPlan);

    /**
     * ---------------------------------------
     * FETCH SUBSCRIPTION
     * ---------------------------------------
     */

    const subscription =
        await Subscription.findOne({
            user: userId,
        });

    if (!subscription) {
        throw new Error(
            "Subscription not found."
        );
    }

    const now = new Date();

    /**
     * ---------------------------------------
     * CHECK ACTIVE STATUS
     * ---------------------------------------
     */

    const isActive =
        isSubscriptionCurrentlyActive(
            subscription,
            now
        );

    if (!isActive) {
        throw new Error(
            "Subscription is not active."
        );
    }

    /**
     * ---------------------------------------
     * CURRENT PLAN
     * ---------------------------------------
     */

    const currentPlan =
        subscription.plan;

    assertValidPlan(currentPlan);

    /**
     * ---------------------------------------
     * SAME PLAN
     * ---------------------------------------
     */

    if (
        currentPlan ===
        nextPlan
    ) {
        throw new Error(
            "Already subscribed to this plan."
        );
    }

    /**
     * ---------------------------------------
     * CANCELLATION PROTECTION
     * ---------------------------------------
     *
     * If cancellation at period end is already
     * scheduled, the user must resume the
     * subscription before changing plans.
     */

    if (
        subscription.cancelAtPeriodEnd
    ) {
        throw new Error(
            "Resume your subscription before changing plans."
        );
    }

    /**
     * ---------------------------------------
     * PLAN HIERARCHY
     * ---------------------------------------
     */

    const currentRank =
        getPlanRank(
            currentPlan
        );

    const nextRank =
        getPlanRank(
            nextPlan
        );

    /**
     * ---------------------------------------
     * PREVENT UPGRADES
     * ---------------------------------------
     *
     * Upgrades must always go through the
     * payment flow.
     */

    if (
        nextRank >
        currentRank
    ) {
        throw new Error(
            "Upgrades must be processed through payment."
        );
    }

    /**
     * ---------------------------------------
     * ENSURE DOWNGRADE
     * ---------------------------------------
     */

    if (
        nextRank >=
        currentRank
    ) {
        throw new Error(
            "Only plan downgrades can be scheduled."
        );
    }

    /**
     * ---------------------------------------
     * EXISTING SCHEDULE
     * ---------------------------------------
     */

    if (
        subscription.changeAtRenewal &&
        subscription.nextPlan
    ) {
        /**
         * Idempotency:
         *
         * If exactly the same downgrade is already
         * scheduled, return the existing document.
         */

        if (
            subscription.nextPlan ===
            nextPlan
        ) {
            return subscription;
        }

        throw new Error(
            `A plan change to ${subscription.nextPlan} is already scheduled.`
        );
    }

    /**
     * ---------------------------------------
     * EXPIRATION DATE
     * ---------------------------------------
     *
     * A scheduled downgrade needs to know when
     * the current billing period ends.
     */

    if (
        !subscription.expiresAt
    ) {
        throw new Error(
            "Subscription does not have a valid renewal date."
        );
    }

    /**
     * The expiration date must still be in
     * the future.
     */

    if (
        subscription.expiresAt <=
        now
    ) {
        throw new Error(
            "Subscription has already expired."
        );
    }

    /**
     * ---------------------------------------
     * ATOMIC UPDATE
     * ---------------------------------------
     *
     * Re-check critical subscription state
     * inside the database query.
     *
     * This protects against concurrent requests
     * attempting to schedule different plan
     * changes at the same time.
     */

    const updatedSubscription =
        await Subscription.findOneAndUpdate(
            {
                _id:
                    subscription._id,

                user: userId,

                status: "ACTIVE",

                cancelAtPeriodEnd:
                    false,

                changeAtRenewal:
                    false,

                $or: [
                    {
                        nextPlan:
                            null,
                    },
                    {
                        nextPlan: {
                            $exists:
                                false,
                        },
                    },
                ],

                expiresAt: {
                    $gt: now,
                },
            },
            {
                $set: {
                    nextPlan,

                    changeAtRenewal:
                        true,
                },
            },
            {
                new: true,

                runValidators: true,
            }
        );

    /**
     * Another request may have modified the
     * subscription between our initial read and
     * the atomic update.
     */

    if (
        !updatedSubscription
    ) {
        throw new Error(
            "Subscription was modified by another request. Please try again."
        );
    }

    console.log(
        `[SUBSCRIPTION] Scheduled plan change: ${String(
            updatedSubscription.user
        )} ${currentPlan} -> ${nextPlan}`
    );

    return updatedSubscription;
};

/**
 * ==========================================
 * CANCEL SCHEDULED PLAN CHANGE
 * ==========================================
 *
 * Removes an existing scheduled downgrade.
 *
 * This does NOT cancel the subscription itself.
 */
export const cancelScheduledPlanChange =
    async (
        userId: string
    ) => {
        /**
         * ---------------------------------------
         * INPUT VALIDATION
         * ---------------------------------------
         */

        assertValidUserId(userId);

        /**
         * ---------------------------------------
         * ATOMIC UPDATE
         * ---------------------------------------
         *
         * Only modify a subscription if an actual
         * scheduled plan change exists.
         */

        const subscription =
            await Subscription.findOneAndUpdate(
                {
                    user: userId,

                    changeAtRenewal:
                        true,

                    nextPlan: {
                        $ne: null,
                    },
                },
                {
                    $set: {
                        nextPlan:
                            null,

                        changeAtRenewal:
                            false,
                    },
                },
                {
                    new: true,

                    runValidators: true,
                }
            );

        if (
            !subscription
        ) {
            throw new Error(
                "No scheduled plan change found."
            );
        }

        console.log(
            `[SUBSCRIPTION] Cancelled scheduled plan change for ${userId}`
        );

        return subscription;
    };

/**
 * ==========================================
 * GET SCHEDULED PLAN CHANGE
 * ==========================================
 *
 * Returns only the information required by
 * the application.
 */
export const getScheduledPlanChange =
    async (
        userId: string
    ): Promise<
        SchedulePlanChangeResult | null
    > => {
        /**
         * ---------------------------------------
         * INPUT VALIDATION
         * ---------------------------------------
         */

        assertValidUserId(userId);

        /**
         * ---------------------------------------
         * FETCH MINIMAL DATA
         * ---------------------------------------
         *
         * There is no need to return the entire
         * subscription document.
         */

        const subscription =
            await Subscription.findOne(
                {
                    user: userId,

                    changeAtRenewal:
                        true,

                    nextPlan: {
                        $ne: null,
                    },
                }
            )
                .select(
                    "plan nextPlan expiresAt"
                )
                .lean();

        if (
            !subscription ||
            !subscription.nextPlan
        ) {
            return null;
        }

        /**
         * ---------------------------------------
         * DEFENSE-IN-DEPTH VALIDATION
         * ---------------------------------------
         */

        if (
            !entitlementService.isValidPlan(
                subscription.plan
            )
        ) {
            throw new Error(
                "Subscription contains an invalid current plan."
            );
        }

        if (
            !entitlementService.isValidPlan(
                subscription.nextPlan
            )
        ) {
            throw new Error(
                "Subscription contains an invalid scheduled plan."
            );
        }

        /**
         * Make sure the scheduled plan is
         * actually lower than the current plan.
         */

        if (
            getPlanRank(
                subscription.nextPlan
            ) >=
            getPlanRank(
                subscription.plan
            )
        ) {
            throw new Error(
                "Subscription contains an invalid scheduled plan change."
            );
        }

        /**
         * ---------------------------------------
         * RETURN SAFE RESPONSE
         * ---------------------------------------
         */

        return {
            currentPlan:
                subscription.plan,

            nextPlan:
                subscription.nextPlan,

            effectiveDate:
                subscription.expiresAt ??
                null,
        };
    };