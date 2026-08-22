import mongoose, {
    ClientSession,
} from "mongoose";

import Subscription, {
    SubscriptionPlan,
} from "../../models/Subscription";

import Payment, {
    IPayment,
} from "../../models/Payment";

import { PLANS } from "../../constants/plans";

import entitlementService from "./entitlement.service";

/**
 * ==========================================
 * PLAN ORDER
 * ==========================================
 *
 * Higher number = higher subscription tier.
 */
const PLAN_ORDER: Record<
    SubscriptionPlan,
    number
> = {
    FREE: 0,
    STARTER: 1,
    GROWTH: 2,
    PRO: 3,
};

/**
 * ==========================================
 * TYPES
 * ==========================================
 */

type ApplySubscriptionOptions = {
    session?: ClientSession;
};

/**
 * ==========================================
 * DATE HELPERS
 * ==========================================
 */

/**
 * Safely add months to a date.
 *
 * JavaScript Date has an important edge case:
 *
 * new Date(2026, 0, 31)
 * + 1 month
 *
 * can overflow into March because February
 * does not have 31 days.
 *
 * We clamp the result to the final day of
 * the target month.
 */
const addMonths = (
    date: Date,
    months: number
): Date => {
    if (
        !(date instanceof Date) ||
        Number.isNaN(
            date.getTime()
        )
    ) {
        throw new Error(
            "Invalid subscription date."
        );
    }

    if (
        !Number.isInteger(months) ||
        months <= 0 ||
        months > 120
    ) {
        throw new Error(
            "Invalid subscription duration."
        );
    }

    const year =
        date.getFullYear();

    const month =
        date.getMonth();

    const day =
        date.getDate();

    const targetMonth =
        month + months;

    /**
     * Start from the first day of the
     * target month.
     */
    const result =
        new Date(
            date
        );

    result.setDate(1);

    result.setMonth(
        targetMonth
    );

    /**
     * Last day of the target month.
     */
    const lastDayOfTargetMonth =
        new Date(
            result.getFullYear(),
            result.getMonth() + 1,
            0
        ).getDate();

    result.setDate(
        Math.min(
            day,
            lastDayOfTargetMonth
        )
    );

    return result;
};

/**
 * ==========================================
 * PLAN HELPERS
 * ==========================================
 */

const isValidSubscriptionPlan = (
    plan: unknown
): plan is SubscriptionPlan => {
    return (
        typeof plan === "string" &&
        Object.prototype.hasOwnProperty.call(
            PLAN_ORDER,
            plan
        )
    );
};

const isUpgrade = (
    current: SubscriptionPlan,
    incoming: SubscriptionPlan
): boolean => {
    return (
        PLAN_ORDER[incoming] >
        PLAN_ORDER[current]
    );
};

const isDowngrade = (
    current: SubscriptionPlan,
    incoming: SubscriptionPlan
): boolean => {
    return (
        PLAN_ORDER[incoming] <
        PLAN_ORDER[current]
    );
};

/**
 * ==========================================
 * PAYMENT VALIDATION
 * ==========================================
 *
 * Never trust the IPayment object passed into
 * this function as the source of truth.
 *
 * Re-fetch the payment from MongoDB.
 */
const getVerifiedPayment = async (
    payment: IPayment,
    session: ClientSession
): Promise<IPayment> => {
    if (!payment?._id) {
        throw new Error(
            "Payment ID is required."
        );
    }

    const storedPayment =
        await Payment.findById(
            payment._id
        )
            .session(session)
            .exec();

    if (!storedPayment) {
        throw new Error(
            "Payment no longer exists."
        );
    }

    /**
     * --------------------------------------
     * PAYMENT STATUS
     * --------------------------------------
     *
     * Only SUCCESS payments can grant
     * subscription access.
     */
    if (
        storedPayment.status !==
        "SUCCESS"
    ) {
        throw new Error(
            "Only successful payments can activate a subscription."
        );
    }

    /**
     * --------------------------------------
     * PAYMENT REFERENCE
     * --------------------------------------
     */

    if (
        typeof storedPayment.reference !==
        "string" ||
        !storedPayment.reference ||
        storedPayment.reference.length >
        128
    ) {
        throw new Error(
            "Invalid payment reference."
        );
    }

    /**
     * --------------------------------------
     * USER
     * --------------------------------------
     */

    if (!storedPayment.user) {
        throw new Error(
            "Payment user is missing."
        );
    }

    /**
     * --------------------------------------
     * PLAN
     * --------------------------------------
     */

    if (
        !isValidSubscriptionPlan(
            storedPayment.plan
        ) ||
        storedPayment.plan ===
        "FREE"
    ) {
        throw new Error(
            "Invalid paid subscription plan."
        );
    }

    /**
     * --------------------------------------
     * AMOUNT
     * --------------------------------------
     *
     * Never trust payment metadata or the
     * frontend amount.
     *
     * Compare against the server-side plan
     * configuration.
     */
    const planConfig =
        PLANS[
        storedPayment.plan
        ];

    if (!planConfig) {
        throw new Error(
            "Payment plan configuration does not exist."
        );
    }

    const expectedAmount =
        Number(
            planConfig.price
        );

    const actualAmount =
        Number(
            storedPayment.amount
        );

    if (
        !Number.isSafeInteger(
            expectedAmount
        ) ||
        expectedAmount <= 0
    ) {
        throw new Error(
            "Invalid server-side subscription price."
        );
    }

    if (
        !Number.isSafeInteger(
            actualAmount
        ) ||
        actualAmount <= 0
    ) {
        throw new Error(
            "Invalid payment amount."
        );
    }

    if (
        actualAmount !==
        expectedAmount
    ) {
        throw new Error(
            "Payment amount does not match the subscription plan."
        );
    }

    /**
     * --------------------------------------
     * PAID AT
     * --------------------------------------
     *
     * A successful payment must have a
     * provider-confirmed timestamp.
     */
    if (
        !storedPayment.paidAt ||
        Number.isNaN(
            storedPayment.paidAt.getTime()
        )
    ) {
        throw new Error(
            "Successful payment is missing a valid paidAt timestamp."
        );
    }

    return storedPayment;
};

/**
 * ==========================================
 * GET SUBSCRIPTION
 * ==========================================
 */

const getSubscription =
    async (
        userId: mongoose.Types.ObjectId,
        session: ClientSession
    ) => {
        return Subscription.findOne({
            user: userId,
        })
            .session(session)
            .exec();
    };

/**
 * ==========================================
 * APPLY SUBSCRIPTION
 * ==========================================
 *
 * Handles:
 *
 * - First subscription
 * - Renewal
 * - Expired subscription
 * - Cancelled subscription
 * - Immediate upgrade
 * - Scheduled downgrade protection
 * - Duplicate payment protection
 *
 * SECURITY:
 *
 * This function must only be called after the
 * payment has been verified and persisted as
 * SUCCESS.
 */
export const applySubscriptionUpgrade =
    async (
        payment: IPayment,
        options: ApplySubscriptionOptions = {}
    ) => {
        /**
         * If the caller already owns a session,
         * use it.
         *
         * Otherwise create our own transaction.
         */
        if (options.session) {
            return applyWithinTransaction(
                payment,
                options.session
            );
        }

        const session =
            await mongoose.startSession();

        try {
            let result:
                | Awaited<
                    ReturnType<
                        typeof applyWithinTransaction
                    >
                >
                | undefined;

            await session.withTransaction(
                async () => {
                    result =
                        await applyWithinTransaction(
                            payment,
                            session
                        );
                },
                {
                    /**
                     * Retry transient transaction
                     * failures automatically.
                     */
                    maxCommitTimeMS: 10000,
                }
            );

            if (!result) {
                throw new Error(
                    "Subscription transaction completed without a result."
                );
            }

            return result;
        } finally {
            await session.endSession();
        }
    };

/**
 * ==========================================
 * TRANSACTION IMPLEMENTATION
 * ==========================================
 */

const applyWithinTransaction =
    async (
        payment: IPayment,
        session: ClientSession
    ) => {
        const now =
            new Date();

        /**
         * --------------------------------------
         * RE-VALIDATE PAYMENT
         * --------------------------------------
         *
         * This is deliberately done inside the
         * transaction.
         */
        const verifiedPayment =
            await getVerifiedPayment(
                payment,
                session
            );

        /**
         * --------------------------------------
         * PAYMENT PLAN
         * --------------------------------------
         */

        const paymentPlan =
            verifiedPayment.plan;

        if (
            !isValidSubscriptionPlan(
                paymentPlan
            ) ||
            paymentPlan === "FREE"
        ) {
            throw new Error(
                `Invalid subscription plan: ${String(
                    paymentPlan
                )}`
            );
        }

        /**
         * --------------------------------------
         * DURATION
         * --------------------------------------
         */

        const durationMonths =
            entitlementService.getDurationMonths(
                paymentPlan
            );

        if (
            !Number.isInteger(
                durationMonths
            ) ||
            durationMonths <= 0 ||
            durationMonths > 120
        ) {
            throw new Error(
                "Invalid subscription duration."
            );
        }

        /**
         * --------------------------------------
         * EXISTING SUBSCRIPTION
         * --------------------------------------
         */

        const existing =
            await getSubscription(
                verifiedPayment.user,
                session
            );

        /**
         * --------------------------------------
         * DUPLICATE PAYMENT PROTECTION
         * --------------------------------------
         *
         * A payment reference can only grant
         * subscription entitlement once.
         */
        if (
            existing?.lastPaymentReference ===
            verifiedPayment.reference
        ) {
            console.warn(
                `[SUBSCRIPTION] Duplicate payment ignored: ${verifiedPayment.reference}`
            );

            return existing;
        }

        /**
         * --------------------------------------
         * FIRST SUBSCRIPTION
         * --------------------------------------
         */

        if (!existing) {
            const startsAt =
                now;

            const expiresAt =
                addMonths(
                    startsAt,
                    durationMonths
                );

            const subscription =
                await Subscription.create(
                    [
                        {
                            user:
                                verifiedPayment.user,

                            plan:
                                paymentPlan,

                            nextPlan:
                                null,

                            changeAtRenewal:
                                false,

                            status:
                                "ACTIVE",

                            startsAt,

                            expiresAt,

                            durationMonths,

                            autoRenew:
                                true,

                            cancelledAt:
                                null,

                            cancelAtPeriodEnd:
                                false,

                            lastPaymentReference:
                                verifiedPayment.reference,
                        },
                    ],
                    {
                        session,
                    }
                );

            if (
                !subscription[0]
            ) {
                throw new Error(
                    "Failed to create subscription."
                );
            }

            console.log(
                `[SUBSCRIPTION] Created ${paymentPlan} subscription for user ${String(
                    verifiedPayment.user
                )}`
            );

            return subscription[0];
        }

        /**
         * --------------------------------------
         * EXISTING SUBSCRIPTION
         * --------------------------------------
         */

        const subscription =
            existing;

        /**
         * Validate the existing plan before
         * using it in entitlement calculations.
         */
        if (
            !isValidSubscriptionPlan(
                subscription.plan
            )
        ) {
            throw new Error(
                `Invalid existing subscription plan: ${String(
                    subscription.plan
                )}`
            );
        }

        /**
         * --------------------------------------
         * VALIDATE EXISTING DATES
         * --------------------------------------
         */

        if (
            subscription.startsAt &&
            Number.isNaN(
                subscription.startsAt.getTime()
            )
        ) {
            throw new Error(
                "Existing subscription has an invalid start date."
            );
        }

        if (
            subscription.expiresAt &&
            Number.isNaN(
                subscription.expiresAt.getTime()
            )
        ) {
            throw new Error(
                "Existing subscription has an invalid expiration date."
            );
        }

        /**
         * --------------------------------------
         * CURRENT ACTIVE STATE
         * --------------------------------------
         *
         * Do not rely solely on status.
         *
         * An ACTIVE subscription whose expiry
         * has passed is no longer active.
         */
        const isActive =
            subscription.status ===
            "ACTIVE" &&
            (
                !subscription.expiresAt ||
                subscription.expiresAt >
                now
            );

        /**
         * --------------------------------------
         * EXPIRED / CANCELLED / INACTIVE
         * --------------------------------------
         *
         * A successful payment can reactivate
         * an inactive subscription.
         */
        if (!isActive) {
            /**
             * A payment for an inactive
             * subscription starts a fresh billing
             * period from the current time.
             */
            const startsAt =
                now;

            const expiresAt =
                addMonths(
                    startsAt,
                    durationMonths
                );

            subscription.plan =
                paymentPlan;

            subscription.status =
                "ACTIVE";

            subscription.startsAt =
                startsAt;

            subscription.expiresAt =
                expiresAt;

            subscription.durationMonths =
                durationMonths;

            subscription.cancelledAt =
                null;

            subscription.cancelAtPeriodEnd =
                false;

            subscription.autoRenew =
                true;

            subscription.nextPlan =
                null;

            subscription.changeAtRenewal =
                false;

            subscription.lastPaymentReference =
                verifiedPayment.reference;

            await subscription.save({
                session,
            });

            console.log(
                `[SUBSCRIPTION] Reactivated ${paymentPlan} for user ${String(
                    verifiedPayment.user
                )} until ${expiresAt.toISOString()}`
            );

            return subscription;
        }

        /**
         * --------------------------------------
         * ACTIVE SAME-PLAN RENEWAL
         * --------------------------------------
         */

        if (
            subscription.plan ===
            paymentPlan
        ) {
            /**
             * A valid active subscription should
             * normally have an expiration date.
             *
             * If it doesn't, use now rather than
             * creating an invalid subscription.
             */
            const currentExpiry =
                subscription.expiresAt ??
                now;

            const newExpiry =
                addMonths(
                    currentExpiry,
                    durationMonths
                );

            subscription.expiresAt =
                newExpiry;

            subscription.durationMonths =
                durationMonths;

            subscription.status =
                "ACTIVE";

            subscription.cancelledAt =
                null;

            subscription.cancelAtPeriodEnd =
                false;

            subscription.autoRenew =
                true;

            subscription.lastPaymentReference =
                verifiedPayment.reference;

            /**
             * A successful renewal overrides
             * a scheduled downgrade.
             */
            subscription.nextPlan =
                null;

            subscription.changeAtRenewal =
                false;

            await subscription.save({
                session,
            });

            console.log(
                `[SUBSCRIPTION] Renewed ${paymentPlan} for user ${String(
                    verifiedPayment.user
                )} until ${newExpiry.toISOString()}`
            );

            return subscription;
        }

        /**
         * --------------------------------------
         * ACTIVE UPGRADE
         * --------------------------------------
         */

        if (
            isUpgrade(
                subscription.plan,
                paymentPlan
            )
        ) {
            /**
             * Do not extend the existing billing
             * period automatically.
             *
             * The current subscription expiry
             * remains unchanged.
             */
            subscription.plan =
                paymentPlan;

            subscription.status =
                "ACTIVE";

            subscription.durationMonths =
                durationMonths;

            subscription.cancelledAt =
                null;

            subscription.cancelAtPeriodEnd =
                false;

            subscription.autoRenew =
                true;

            subscription.lastPaymentReference =
                verifiedPayment.reference;

            /**
             * Upgrade overrides any scheduled
             * downgrade.
             */
            subscription.nextPlan =
                null;

            subscription.changeAtRenewal =
                false;

            await subscription.save({
                session,
            });

            console.log(
                `[SUBSCRIPTION] Upgraded user ${String(
                    verifiedPayment.user
                )} to ${paymentPlan}`
            );

            return subscription;
        }

        /**
         * --------------------------------------
         * ACTIVE DOWNGRADE
         * --------------------------------------
         *
         * This should NOT normally reach this
         * function.
         *
         * Your initializePayment controller
         * schedules downgrades instead of taking
         * payment for them.
         *
         * Rejecting it here provides a second
         * security boundary in case someone
         * attempts to call this service directly.
         */
        if (
            isDowngrade(
                subscription.plan,
                paymentPlan
            )
        ) {
            throw new Error(
                `Cannot apply paid downgrade: ${subscription.plan} -> ${paymentPlan}`
            );
        }

        /**
         * --------------------------------------
         * UNKNOWN TRANSITION
         * --------------------------------------
         *
         * Never silently mutate a subscription
         * when the state does not match an
         * explicitly supported transition.
         */
        throw new Error(
            `Unsupported subscription transition: ${subscription.plan} -> ${paymentPlan}`
        );
    };

export default applySubscriptionUpgrade;