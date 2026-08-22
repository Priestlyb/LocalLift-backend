import mongoose, {
    Document,
    Schema,
    Types,
} from "mongoose";

import {
    PaymentProvider,
    PaymentPlan,
    PaymentStatus,
    IPaymentMetadata,
} from "../types/payment.types";

/**
 * ==========================================
 * PAYMENT DOCUMENT
 * ==========================================
 */

export interface IPayment extends Document {
    user: Types.ObjectId;

    provider: PaymentProvider;

    /**
     * Server-generated payment reference.
     *
     * This must never come directly from the
     * client.
     */
    reference: string;

    plan: PaymentPlan;

    /**
     * Payment amount in the application's
     * base currency unit.
     *
     * Example:
     *
     * NGN 6,000 -> 6000
     *
     * Provider-specific conversion is handled
     * by the provider service.
     */
    amount: number;

    status: PaymentStatus;

    /**
     * Provider-confirmed payment timestamp.
     */
    paidAt?: Date | null;

    /**
     * Safe application metadata only.
     */
    metadata?: IPaymentMetadata;

    createdAt: Date;

    updatedAt: Date;
}

/**
 * ==========================================
 * PAYMENT SCHEMA
 * ==========================================
 */

const paymentSchema =
    new Schema<IPayment>(
        {
            /**
             * ======================================
             * USER
             * ======================================
             */

            user: {
                type: Schema.Types.ObjectId,

                ref: "User",

                required: true,

                index: true,

                /**
                 * Payment ownership must never change
                 * after the payment is created.
                 */
                immutable: true,
            },

            /**
             * ======================================
             * PAYMENT PROVIDER
             * ======================================
             */

            provider: {
                type: String,

                enum: {
                    values: [
                        "KORA",
                        "PAYSTACK",
                    ],

                    message:
                        "Invalid payment provider.",
                },

                required: true,

                /**
                 * Provider cannot change after
                 * payment creation.
                 */
                immutable: true,

                index: true,
            },

            /**
             * ======================================
             * PAYMENT REFERENCE
             * ======================================
             *
             * Server-generated unique identifier.
             */

            reference: {
                type: String,

                required: true,

                unique: true,

                index: true,

                trim: true,

                minlength: 10,

                maxlength: 128,

                /**
                 * Provider reference must never
                 * be changed after creation.
                 */
                immutable: true,

                /**
                 * Only allow safe characters.
                 */
                match: [
                    /^[A-Za-z0-9._:-]+$/,

                    "Invalid payment reference format.",
                ],
            },

            /**
             * ======================================
             * PLAN
             * ======================================
             */

            plan: {
                type: String,

                enum: {
                    values: [
                        "FREE",
                        "STARTER",
                        "GROWTH",
                        "PRO",
                    ],

                    message:
                        "Invalid payment plan.",
                },

                required: true,

                /**
                 * A payment must always remain
                 * associated with the plan that
                 * was purchased.
                 */
                immutable: true,

                index: true,
            },

            /**
             * ======================================
             * AMOUNT
             * ======================================
             *
             * IMPORTANT:
             *
             * This value must come from the
             * server-side PLANS configuration.
             *
             * Never trust an amount supplied by
             * the frontend.
             */

            amount: {
                type: Number,

                required: true,

                min: [
                    0,

                    "Payment amount cannot be negative.",
                ],

                max: [
                    100000000000,

                    "Payment amount is too large.",
                ],

                /**
                 * Payment amounts must be finite
                 * integers.
                 */
                validate: {
                    validator: (
                        value: number
                    ) =>
                        Number.isFinite(
                            value
                        ) &&
                        Number.isSafeInteger(
                            value
                        ),

                    message:
                        "Payment amount must be a valid integer.",
                },

                /**
                 * Payment amount must never
                 * change after creation.
                 */
                immutable: true,

                index: true,
            },

            /**
             * ======================================
             * PAYMENT STATUS
             * ======================================
             */

            status: {
                type: String,

                enum: {
                    values: [
                        "PENDING",
                        "SUCCESS",
                        "FAILED",
                        "CANCELLED",
                    ],

                    message:
                        "Invalid payment status.",
                },

                required: true,

                default: "PENDING",

                index: true,
            },

            /**
             * ======================================
             * PAID AT
             * ======================================
             *
             * Only populated after the provider
             * confirms a successful payment.
             */

            paidAt: {
                type: Date,

                default: null,

                validate: {
                    validator: (
                        value: Date | null
                    ) => {
                        if (!value) {
                            return true;
                        }

                        return (
                            value instanceof Date &&
                            !Number.isNaN(
                                value.getTime()
                            )
                        );
                    },

                    message:
                        "Invalid payment date.",
                },
            },

            /**
             * ======================================
             * METADATA
             * ======================================
             *
             * Metadata may contain provider or
             * application-specific information.
             *
             * NEVER store:
             *
             * - passwords
             * - JWTs
             * - API keys
             * - provider secrets
             * - OTPs
             * - transaction PINs
             * - card details
             * - bank credentials
             */

            metadata: {
                type: Schema.Types.Mixed,

                default: {},
            },
        },
        {
            /**
             * Automatically maintain createdAt
             * and updatedAt.
             */
            timestamps: true,

            /**
             * Reject unknown document fields.
             */
            strict: true,

            /**
             * Reject unknown query fields where
             * Mongoose strict-query behavior applies.
             */
            strictQuery: true,

            /**
             * Do not expose Mongoose __v.
             */
            versionKey: false,
        }
    );

/**
 * ==========================================
 * INDEXES
 * ==========================================
 */

/**
 * User payment history.
 */
paymentSchema.index({
    user: 1,
    createdAt: -1,
});

/**
 * Provider/status reporting.
 */
paymentSchema.index({
    provider: 1,
    status: 1,
    createdAt: -1,
});

/**
 * Administrative reporting.
 */
paymentSchema.index({
    plan: 1,
    status: 1,
    createdAt: -1,
});

/**
 * Pending payment cleanup/reconciliation.
 */
paymentSchema.index({
    status: 1,
    createdAt: 1,
});

/**
 * ==========================================
 * VALID PAYMENT STATUS TRANSITIONS
 * ==========================================
 *
 * Allowed:
 *
 * PENDING
 *   -> SUCCESS
 *   -> FAILED
 *   -> CANCELLED
 *
 * SUCCESS
 *   -> no transition
 *
 * FAILED
 *   -> no transition
 *
 * CANCELLED
 *   -> no transition
 *
 * This prevents an already successful payment
 * from being changed back to FAILED or
 * CANCELLED.
 */

const VALID_PAYMENT_STATUS_TRANSITIONS: Record<
    PaymentStatus,
    readonly PaymentStatus[]
> = {
    PENDING: [
        "SUCCESS",
        "FAILED",
        "CANCELLED",
    ],

    SUCCESS: [],

    FAILED: [],

    CANCELLED: [],
};

/**
 * ==========================================
 * SCHEMA VALIDATION
 * ==========================================
 *
 * Validate paidAt/status consistency.
 */

paymentSchema.pre(
    "validate",
    function () {
        /**
         * Successful payments must have
         * a provider-confirmed paidAt timestamp.
         */
        if (
            this.status === "SUCCESS" &&
            !this.paidAt
        ) {
            this.invalidate(
                "paidAt",
                "Successful payments must have a paidAt timestamp."
            );
        }

        /**
         * Non-successful payments must not
         * have a paidAt timestamp.
         */
        if (
            this.status !== "SUCCESS" &&
            this.paidAt
        ) {
            this.invalidate(
                "paidAt",
                "Only successful payments can have a paidAt timestamp."
            );
        }
    }
);

/**
 * ==========================================
 * PROTECT PAYMENT IDENTITY
 * ==========================================
 *
 * Payment identity fields cannot be changed
 * after creation.
 *
 * This provides an additional application-level
 * protection on top of `immutable: true`.
 */

paymentSchema.pre(
    "save",
    async function () {
        /**
         * Nothing to protect on creation.
         */
        if (this.isNew) {
            return;
        }

        /**
         * These fields define the identity of
         * the payment and must never change.
         */
        const protectedFields = [
            "user",
            "provider",
            "reference",
            "plan",
            "amount",
        ] as const;

        for (
            const field of protectedFields
        ) {
            if (
                this.isModified(field)
            ) {
                throw new Error(
                    `Payment identity field "${field}" cannot be modified.`
                );
            }
        }
    }
);

/**
 * ==========================================
 * PAYMENT STATUS TRANSITION PROTECTION
 * ==========================================
 *
 * This middleware runs before save and checks
 * the current database state before allowing
 * a status transition.
 *
 * IMPORTANT:
 *
 * We use the actual Payment model instead of:
 *
 * this.constructor.findById()
 *
 * or:
 *
 * this.model<IPayment>("Payment")
 *
 * because Mongoose's TypeScript definitions
 * do not treat IPayment as a Model type.
 */

paymentSchema.pre(
    "save",
    async function () {
        /**
         * New payments do not have a previous
         * database state.
         */
        if (this.isNew) {
            return;
        }

        /**
         * No status change means there is
         * nothing to validate.
         */
        if (
            !this.isModified(
                "status"
            )
        ) {
            return;
        }

        /**
         * Fetch the existing payment directly
         * through the Mongoose model.
         *
         * The middleware only executes after the
         * model has been initialized, so using
         * Payment here is safe.
         */
        const existingPayment =
            await Payment
                .findById(this._id)
                .select("status")
                .lean();

        /**
         * If the payment no longer exists,
         * reject the update.
         */
        if (!existingPayment) {
            throw new Error(
                "Payment no longer exists."
            );
        }

        /**
         * Explicitly narrow the database values
         * to our application-level PaymentStatus
         * union.
         */
        const previousStatus =
            existingPayment.status as PaymentStatus;

        const currentStatus =
            this.status as PaymentStatus;

        /**
         * No actual transition.
         */
        if (
            previousStatus ===
            currentStatus
        ) {
            return;
        }

        /**
         * Get allowed transitions using the
         * strongly typed status union.
         */
        const allowedTransitions =
            VALID_PAYMENT_STATUS_TRANSITIONS[
            previousStatus
            ];

        /**
         * Reject invalid state changes.
         */
        if (
            !allowedTransitions.includes(
                currentStatus
            )
        ) {
            throw new Error(
                `Invalid payment status transition: ${previousStatus} -> ${currentStatus}`
            );
        }
    }
);

/**
 * ==========================================
 * MODEL
 * ==========================================
 */

const Payment =
    mongoose.model<IPayment>(
        "Payment",
        paymentSchema
    );

export default Payment;