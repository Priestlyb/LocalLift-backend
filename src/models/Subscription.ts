import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface ISubscription
  extends Document {
  user: mongoose.Types.ObjectId;

  plan:
  | "FREE"
  | "STARTER"
  | "GROWTH"
  | "PRO";

  status:
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "PENDING"
  | "PAST_DUE";

  startsAt: Date;

  expiresAt: Date | null;

  /**
   * Date the subscription was cancelled.
   * Null until cancellation.
   */
  cancelledAt: Date | null;

  durationMonths: number;

  autoRenew: boolean;

  lastPaymentReference: string | null;
}

const subscriptionSchema =
  new Schema<ISubscription>(
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
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
        default: "FREE",
      },

      status: {
        type: String,
        enum: [
          "ACTIVE",
          "EXPIRED",
          "CANCELLED",
          "PENDING",
          "PAST_DUE",
        ],
        default: "ACTIVE",
        index: true,
      },

      /**
       * Subscription start date.
       */
      startsAt: {
        type: Date,
        default: Date.now,
      },

      /**
       * Subscription expiration date.
       * FREE subscriptions can leave this null.
       */
      expiresAt: {
        type: Date,
        default: null,
        index: true,
      },

      /**
       * Date the subscription was cancelled.
       * Remains null until cancellation.
       */
      cancelledAt: {
        type: Date,
        default: null,
        index: true,
      },

      /**
       * Billing duration.
       * Defaults to one month.
       */
      durationMonths: {
        type: Number,
        default: 1,
        min: 1,
      },

      /**
       * Whether the subscription should
       * automatically renew after payment.
       */
      autoRenew: {
        type: Boolean,
        default: true,
      },

      /**
       * Used for payment idempotency.
       * Prevents duplicate webhook processing.
       */
      lastPaymentReference: {
        type: String,
        default: null,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema
);