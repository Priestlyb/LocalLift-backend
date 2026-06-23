import mongoose, { Document, Schema } from "mongoose";

export interface IPayment extends Document {
    user: mongoose.Types.ObjectId;

    provider: "KORA" | "PAYSTACK";

    reference: string;

    plan: "FREE" | "STARTER" | "GROWTH" | "PRO";

    amount: number;

    status:
    | "PENDING"
    | "SUCCESS"
    | "FAILED"
    | "CANCELLED";

    paidAt?: Date;

    metadata?: Record<string, any>;

    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        provider: {
            type: String,
            enum: [
                "KORA",
                "PAYSTACK",
            ],
            required: true,
        },

        reference: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },

        plan: {
            type: String,
            enum: [
                "FREE",
                "STARTER",
                "GROWTH",
                "PRO",
            ],
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "SUCCESS",
                "FAILED",
                "CANCELLED",
            ],
            default: "PENDING",
            index: true,
        },

        paidAt: {
            type: Date,
            default: null,
        },

        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

/**
 * Useful indexes for:
 * - payment lookup
 * - user payment history
 * - admin reporting
 */
paymentSchema.index({
    user: 1,
    createdAt: -1,
});

paymentSchema.index({
    provider: 1,
    reference: 1,
});

export default mongoose.model<IPayment>(
    "Payment",
    paymentSchema
);