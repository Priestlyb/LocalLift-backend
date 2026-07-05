import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type SubscriptionPlan =
  | "FREE"
  | "STARTER"
  | "GROWTH"
  | "PRO";

export type SubscriptionStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "PENDING"
  | "PAST_DUE";

export interface ISubscription
  extends Document {
  user: mongoose.Types.ObjectId;

  plan: SubscriptionPlan;

  /**
   * Scheduled plan to be applied
   * when the current billing cycle ends.
   * Used for downgrades.
   */
  nextPlan: SubscriptionPlan | null;

  /**
   * Whether a scheduled plan change
   * should be applied when this
   * subscription renews/expires.
   */
  changeAtRenewal: boolean;

  status: SubscriptionStatus;

  startsAt: Date;

  expiresAt: Date | null;

  /**
   * Date the subscription was cancelled.
   * Null until cancellation.
   */
  cancelledAt: Date | null;

  /**
   * Billing duration in months.
   */
  durationMonths: number;

  /**
   * Whether the subscription should
   * automatically renew.
   */
  autoRenew: boolean;

  /**
   * Last successfully processed payment.
   * Prevents duplicate webhook/payment
   * verification from extending the
   * subscription twice.
   */
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

      /**
       * Future scheduled plan.
       * Used for downgrades.
       */
      nextPlan: {
        type: String,
        enum: [
          "FREE",
          "STARTER",
          "GROWTH",
          "PRO",
        ],
        default: null,
      },

      /**
       * Whether nextPlan should
       * replace plan when the
       * subscription renews.
       */
      changeAtRenewal: {
        type: Boolean,
        default: false,
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
       */
      cancelledAt: {
        type: Date,
        default: null,
        index: true,
      },

      /**
       * Billing duration.
       */
      durationMonths: {
        type: Number,
        default: 1,
        min: 1,
      },

      /**
       * Whether this subscription
       * automatically renews.
       */
      autoRenew: {
        type: Boolean,
        default: true,
      },

      /**
       * Last processed payment.
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