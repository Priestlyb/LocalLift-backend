import Subscription from "../../models/Subscription";

import entitlementService from "./entitlement.service";

/**
 * ==========================================
 * SUBSCRIPTION EXPIRATION SERVICE
 * ==========================================
 *
 * Expires subscriptions whose billing period
 * has ended and applies scheduled plan changes.
 *
 * Intended to run from a cron job / worker.
 *
 * SECURITY & RELIABILITY PRINCIPLES
 * ------------------------------------------
 *
 * 1. Never trust subscription plan values.
 * 2. Never allow an expired paid subscription
 *    to remain ACTIVE.
 * 3. Validate scheduled plans before applying them.
 * 4. Use atomic database updates to reduce cron
 *    race conditions.
 * 5. Process subscriptions in batches.
 * 6. Do not accidentally reactivate subscriptions
 *    without a successful payment.
 * 7. FREE is handled explicitly.
 */

/**
 * ==========================================
 * CONSTANTS
 * ==========================================
 */

const BATCH_SIZE = 100;

/**
 * ==========================================
 * HELPERS
 * ==========================================
 */

/**
 * Safely calculate the expiry date for a plan.
 *
 * We avoid mutating the original Date object.
 */
const calculateExpiryDate = (
    startDate: Date,
    durationMonths: number
): Date => {
    if (
        !(startDate instanceof Date) ||
        Number.isNaN(
            startDate.getTime()
        )
    ) {
        throw new Error(
            "Invalid subscription start date."
        );
    }

    if (
        !Number.isSafeInteger(
            durationMonths
        ) ||
        durationMonths <= 0
    ) {
        throw new Error(
            "Invalid subscription duration."
        );
    }

    const expiry =
        new Date(startDate);

    expiry.setMonth(
        expiry.getMonth() +
        durationMonths
    );

    /**
     * Protect against Date overflow.
     */
    if (
        Number.isNaN(
            expiry.getTime()
        )
    ) {
        throw new Error(
            "Failed to calculate subscription expiry date."
        );
    }

    return expiry;
};

/**
 * ==========================================
 * MAIN SERVICE
 * ==========================================
 */

export const expireSubscriptions =
    async () => {
        const now =
            new Date();

        let processed = 0;

        let expired = 0;

        let downgraded = 0;

        let skipped = 0;

        /**
         * --------------------------------------
         * FETCH EXPIRED ACTIVE SUBSCRIPTIONS
         * --------------------------------------
         *
         * Only fetch IDs and fields actually
         * required by this worker.
         *
         * We use a limit so one cron execution
         * cannot consume excessive memory.
         */
        const subscriptions =
            await Subscription.find(
                {
                    status:
                        "ACTIVE",

                    expiresAt: {
                        $lte: now,
                    },
                },
                {
                    _id: 1,
                    user: 1,
                    plan: 1,
                    status: 1,
                    startsAt: 1,
                    expiresAt: 1,
                    durationMonths: 1,
                    nextPlan: 1,
                    changeAtRenewal: 1,
                    lastPaymentReference: 1,
                    cancelAtPeriodEnd: 1,
                    cancelledAt: 1,
                    autoRenew: 1,
                }
            )
                .sort({
                    expiresAt: 1,
                })
                .limit(
                    BATCH_SIZE
                );

        /**
         * --------------------------------------
         * PROCESS EACH SUBSCRIPTION
         * --------------------------------------
         */

        for (
            const subscription of subscriptions
        ) {
            processed++;

            try {
                /**
                 * --------------------------------
                 * RE-VALIDATE STATE
                 * --------------------------------
                 *
                 * Another worker/request may have
                 * modified the subscription after
                 * the initial query.
                 *
                 * Never blindly overwrite a record
                 * based on stale data.
                 */
                const current =
                    await Subscription.findOne(
                        {
                            _id:
                                subscription._id,

                            status:
                                "ACTIVE",

                            expiresAt: {
                                $lte: now,
                            },
                        }
                    );

                if (!current) {
                    skipped++;

                    continue;
                }

                /**
                 * --------------------------------
                 * SCHEDULED PLAN CHANGE
                 * --------------------------------
                 */

                if (
                    current.changeAtRenewal &&
                    current.nextPlan
                ) {
                    const nextPlan =
                        current.nextPlan;

                    /**
                     * Validate the scheduled
                     * plan at runtime.
                     */
                    if (
                        !entitlementService.isValidPlan(
                            nextPlan
                        )
                    ) {
                        console.error(
                            "[SUBSCRIPTION] Invalid scheduled plan.",
                            {
                                subscriptionId:
                                    String(
                                        current._id
                                    ),

                                userId:
                                    String(
                                        current.user
                                    ),

                                nextPlan,
                            }
                        );

                        /**
                         * Fail closed.
                         *
                         * Do not activate an unknown
                         * plan.
                         *
                         * Instead expire the existing
                         * subscription.
                         */
                        const result =
                            await Subscription.updateOne(
                                {
                                    _id:
                                        current._id,

                                    status:
                                        "ACTIVE",

                                    expiresAt: {
                                        $lte: now,
                                    },
                                },
                                {
                                    $set: {
                                        status:
                                            "EXPIRED",

                                        cancelAtPeriodEnd:
                                            false,

                                        autoRenew:
                                            false,
                                    },
                                }
                            );

                        if (
                            result.modifiedCount >
                            0
                        ) {
                            expired++;
                        }

                        continue;
                    }

                    /**
                     * --------------------------------
                     * SCHEDULED FREE DOWNGRADE
                     * --------------------------------
                     *
                     * FREE does not need a paid
                     * expiration period.
                     */
                    if (
                        nextPlan ===
                        "FREE"
                    ) {
                        const result =
                            await Subscription.updateOne(
                                {
                                    _id:
                                        current._id,

                                    status:
                                        "ACTIVE",

                                    expiresAt: {
                                        $lte: now,
                                    },

                                    changeAtRenewal:
                                        true,

                                    nextPlan:
                                        "FREE",
                                },
                                {
                                    $set: {
                                        plan:
                                            "FREE",

                                        status:
                                            "ACTIVE",

                                        startsAt:
                                            now,

                                        expiresAt:
                                            null,

                                        durationMonths:
                                            0,

                                        nextPlan:
                                            null,

                                        changeAtRenewal:
                                            false,

                                        lastPaymentReference:
                                            null,

                                        cancelAtPeriodEnd:
                                            false,

                                        cancelledAt:
                                            null,

                                        autoRenew:
                                            false,
                                    },
                                }
                            );

                        if (
                            result.modifiedCount >
                            0
                        ) {
                            downgraded++;

                            console.log(
                                `[SUBSCRIPTION] Applied scheduled downgrade for ${String(
                                    current.user
                                )} → FREE`
                            );
                        } else {
                            skipped++;
                        }

                        continue;
                    }

                    /**
                     * --------------------------------
                     * SCHEDULED PAID PLAN
                     * --------------------------------
                     */

                    const durationMonths =
                        entitlementService.getDurationMonths(
                            nextPlan
                        );

                    const newExpiresAt =
                        calculateExpiryDate(
                            now,
                            durationMonths
                        );

                    /**
                     * A scheduled downgrade is
                     * not a new payment.
                     *
                     * It simply activates the
                     * already scheduled plan.
                     */
                    const result =
                        await Subscription.updateOne(
                            {
                                _id:
                                    current._id,

                                status:
                                    "ACTIVE",

                                expiresAt: {
                                    $lte: now,
                                },

                                changeAtRenewal:
                                    true,

                                nextPlan,
                            },
                            {
                                $set: {
                                    plan:
                                        nextPlan,

                                    status:
                                        "ACTIVE",

                                    startsAt:
                                        now,

                                    expiresAt:
                                        newExpiresAt,

                                    durationMonths:
                                        durationMonths,

                                    nextPlan:
                                        null,

                                    changeAtRenewal:
                                        false,

                                    lastPaymentReference:
                                        null,

                                    cancelAtPeriodEnd:
                                        false,

                                    cancelledAt:
                                        null,

                                    autoRenew:
                                        true,
                                },
                            }
                        );

                    if (
                        result.modifiedCount >
                        0
                    ) {
                        downgraded++;

                        console.log(
                            `[SUBSCRIPTION] Applied scheduled change for ${String(
                                current.user
                            )} → ${nextPlan}`
                        );
                    } else {
                        skipped++;
                    }

                    continue;
                }

                /**
                 * --------------------------------
                 * NO SCHEDULED PLAN CHANGE
                 * --------------------------------
                 *
                 * Simply expire the subscription.
                 */
                const result =
                    await Subscription.updateOne(
                        {
                            _id:
                                current._id,

                            status:
                                "ACTIVE",

                            expiresAt: {
                                $lte: now,
                            },

                            /**
                             * Ensure another worker
                             * has not scheduled a plan
                             * change between our reads.
                             */
                            changeAtRenewal: {
                                $ne:
                                    true,
                            },
                        },
                        {
                            $set: {
                                status:
                                    "EXPIRED",

                                cancelAtPeriodEnd:
                                    false,

                                autoRenew:
                                    false,
                            },
                        }
                    );

                if (
                    result.modifiedCount >
                    0
                ) {
                    expired++;

                    console.log(
                        `[SUBSCRIPTION] Expired subscription for ${String(
                            current.user
                        )}`
                    );
                } else {
                    skipped++;
                }
            } catch (error) {
                /**
                 * --------------------------------
                 * INDIVIDUAL SUBSCRIPTION FAILURE
                 * --------------------------------
                 *
                 * Do not stop the entire cron job
                 * because one subscription failed.
                 */
                console.error(
                    "[SUBSCRIPTION] Failed to process subscription.",
                    {
                        subscriptionId:
                            String(
                                subscription._id
                            ),

                        userId:
                            String(
                                subscription.user
                            ),

                        error:
                            error instanceof
                                Error
                                ? error.message
                                : "Unknown error",
                    }
                );

                skipped++;
            }
        }

        /**
         * --------------------------------------
         * RESULT
         * --------------------------------------
         */

        return {
            processed,

            expired,

            downgraded,

            skipped,

            batchSize:
                BATCH_SIZE,

            hasMore:
                subscriptions.length >=
                BATCH_SIZE,
        };
    };