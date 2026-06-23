import mongoose, { Schema, Document } from "mongoose";

export interface IWebhookEvent extends Document {
    provider: "KORA" | "PAYSTACK";
    reference: string;
    event: string;
    payload: any;
    processed: boolean;
}

const webhookEventSchema = new Schema<IWebhookEvent>(
    {
        provider: {
            type: String,
            enum: ["KORA", "PAYSTACK"],
            required: true,
        },

        reference: {
            type: String,
            required: true,
            index: true,
        },

        event: {
            type: String,
            required: true,
        },

        payload: {
            type: Schema.Types.Mixed,
        },

        processed: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// 🔒 Prevent duplicates (idempotency key)
webhookEventSchema.index(
    { provider: 1, reference: 1, event: 1 },
    { unique: true }
);

export default mongoose.model<IWebhookEvent>(
    "WebhookEvent",
    webhookEventSchema
);