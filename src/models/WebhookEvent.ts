import mongoose, {
    Document,
    Schema,
} from "mongoose";

/**
 * ==========================================
 * WEBHOOK EVENT TYPES
 * ==========================================
 */

export type WebhookProvider =
    | "KORA"
    | "PAYSTACK";

/**
 * ==========================================
 * WEBHOOK EVENT DOCUMENT
 * ==========================================
 *
 * Stores a verified payment-provider webhook
 * so that webhook processing is:
 *
 * - Idempotent
 * - Auditable
 * - Retryable
 * - Protected against duplicate delivery
 *
 * IMPORTANT:
 *
 * This model should only receive data AFTER the
 * provider signature has been verified.
 */

export interface IWebhookEvent
    extends Document {
    provider: WebhookProvider;

    /**
     * Payment reference supplied by the
     * payment provider.
     */
    reference: string;

    /**
     * Provider event name.
     */
    event: string;

    /**
     * Original verified provider payload.
     *
     * Never store secrets, authorization headers,
     * webhook signatures, or other credentials here.
     */
    payload: Record<string, unknown>;

    /**
     * Whether the webhook has been successfully
     * processed by the background payment worker.
     */
    processed: boolean;

    /**
     * Number of processing attempts.
     */
    attempts: number;

    /**
     * Last processing attempt timestamp.
     */
    lastAttemptAt?: Date | null;

    /**
     * Successful processing timestamp.
     */
    processedAt?: Date | null;

    /**
     * Error from the most recent processing attempt.
     */
    processingError?: string | null;

    createdAt: Date;

    updatedAt: Date;
}

/**
 * ==========================================
 * SCHEMA
 * ==========================================
 */

const webhookEventSchema =
    new Schema<IWebhookEvent>(
        {
            /**
             * ======================================
             * PROVIDER
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
                        "Invalid webhook provider.",
                },

                required: true,

                immutable: true,

                index: true,
            },

            /**
             * ======================================
             * PAYMENT REFERENCE
             * ======================================
             */

            reference: {
                type: String,

                required: true,

                trim: true,

                minlength: 1,

                maxlength: 128,

                immutable: true,

                index: true,

                match: [
                    /^[A-Za-z0-9._:-]+$/,

                    "Invalid webhook reference format.",
                ],
            },

            /**
             * ======================================
             * PROVIDER EVENT
             * ======================================
             */

            event: {
                type: String,

                required: true,

                trim: true,

                minlength: 1,

                maxlength: 100,

                immutable: true,

                index: true,

                match: [
                    /^[A-Za-z0-9._:-]+$/,

                    "Invalid webhook event format.",
                ],
            },

            /**
             * ======================================
             * VERIFIED PAYLOAD
             * ======================================
             */

            payload: {
                type: Schema.Types.Mixed,

                required: true,

                default: {},
            },

            /**
             * ======================================
             * PROCESSING STATE
             * ======================================
             */

            processed: {
                type: Boolean,

                default: false,

                index: true,
            },

            /**
             * ======================================
             * PROCESSING ATTEMPTS
             * ======================================
             */

            attempts: {
                type: Number,

                default: 0,

                min: 0,

                max: 100,
            },

            /**
             * ======================================
             * LAST ATTEMPT
             * ======================================
             */

            lastAttemptAt: {
                type: Date,

                default: null,
            },

            /**
             * ======================================
             * PROCESSED AT
             * ======================================
             */

            processedAt: {
                type: Date,

                default: null,
            },

            /**
             * ======================================
             * PROCESSING ERROR
             * ======================================
             */

            processingError: {
                type: String,

                default: null,

                maxlength: 2000,

                trim: true,
            },
        },
        {
            timestamps: true,

            strict: true,

            strictQuery: true,

            versionKey: false,
        }
    );

/**
 * ==========================================
 * IDEMPOTENCY INDEX
 * ==========================================
 */

webhookEventSchema.index(
    {
        provider: 1,
        reference: 1,
        event: 1,
    },
    {
        unique: true,

        name:
            "webhook_idempotency_unique",
    }
);

/**
 * ==========================================
 * PROCESSING INDEX
 * ==========================================
 */

webhookEventSchema.index({
    processed: 1,
    createdAt: 1,
});

/**
 * ==========================================
 * REFERENCE LOOKUP INDEX
 * ==========================================
 */

webhookEventSchema.index({
    provider: 1,
    reference: 1,
    createdAt: -1,
});

/**
 * ==========================================
 * VALIDATION
 * ==========================================
 *
 * Async middleware is intentionally used here
 * instead of the callback-style `next` API.
 *
 * This avoids Mongoose/TypeScript overload
 * conflicts with newer Mongoose versions.
 */

webhookEventSchema.pre(
    "validate",
    function () {
        /**
         * A processed webhook must have a
         * processedAt timestamp.
         */
        if (
            this.processed &&
            !this.processedAt
        ) {
            this.invalidate(
                "processedAt",
                "Processed webhook events must have a processedAt timestamp."
            );
        }

        /**
         * An unprocessed webhook should not
         * claim to have completed processing.
         */
        if (
            !this.processed &&
            this.processedAt
        ) {
            this.invalidate(
                "processedAt",
                "Unprocessed webhook events cannot have a processedAt timestamp."
            );
        }
    }
);

/**
 * ==========================================
 * PROTECT IMMUTABLE WEBHOOK IDENTITY
 * ==========================================
 *
 * Provider, reference and event form the
 * webhook's idempotency identity.
 *
 * They must never change after creation.
 */

webhookEventSchema.pre(
    "save",
    function () {
        if (
            !this.isNew &&
            (
                this.isModified(
                    "provider"
                ) ||
                this.isModified(
                    "reference"
                ) ||
                this.isModified("event")
            )
        ) {
            throw new Error(
                "Webhook identity fields cannot be modified."
            );
        }
    }
);

/**
 * ==========================================
 * PROTECT PROCESSED EVENTS
 * ==========================================
 *
 * Once successfully processed, a webhook
 * should never be reverted to an unprocessed
 * state.
 */

webhookEventSchema.pre(
    "save",
    async function () {
        if (
            this.isNew ||
            !this.isModified("processed")
        ) {
            return;
        }

        /**
         * Use the model directly instead of
         * `this.constructor.findById()`.
         *
         * Mongoose types `this.constructor` as
         * Function inside document middleware,
         * which does not expose findById().
         */
        const existingWebhook =
            await WebhookEvent.findById(
                this._id
            ).select("processed");

        if (!existingWebhook) {
            throw new Error(
                "Webhook event no longer exists."
            );
        }

        /**
         * Prevent:
         *
         * true -> false
         */
        if (
            existingWebhook.processed &&
            !this.processed
        ) {
            throw new Error(
                "A processed webhook cannot be marked as unprocessed."
            );
        }
    }
);

/**
 * ==========================================
 * MODEL
 * ==========================================
 */

const WebhookEvent =
    mongoose.model<IWebhookEvent>(
        "WebhookEvent",
        webhookEventSchema
    );

export default WebhookEvent;