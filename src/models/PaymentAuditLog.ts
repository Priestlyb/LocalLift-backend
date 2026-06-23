import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentAuditLog extends Document {
    payment: mongoose.Types.ObjectId;
    provider: "KORA" | "PAYSTACK";
    event: string;
    message: string;
    raw?: any;
}

const paymentAuditSchema =
    new Schema<IPaymentAuditLog>(
        {
            payment: {
                type: Schema.Types.ObjectId,
                ref: "Payment",
                required: true,
            },

            provider: {
                type: String,
                enum: ["KORA", "PAYSTACK"],
                required: true,
            },

            event: String,

            message: String,

            raw: Schema.Types.Mixed,
        },
        { timestamps: true }
    );

export default mongoose.model<IPaymentAuditLog>(
    "PaymentAuditLog",
    paymentAuditSchema
);