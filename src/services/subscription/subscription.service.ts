import Subscription from "../../models/Subscription";
import { IPayment } from "../../models/Payment";
import entitlementService from "./entitlement.service";

const addMonths = (
  date: Date,
  months: number
): Date => {
  const result = new Date(date);

  result.setMonth(
    result.getMonth() + months
  );

  return result;
};

/**
 * Creates or renews a user's subscription after
 * a successful payment.
 */
export const applySubscriptionUpgrade =
  async (payment: IPayment) => {
    const now = new Date();

    if (
      !entitlementService.isValidPlan(
        payment.plan
      )
    ) {
      throw new Error(
        `Invalid subscription plan: ${payment.plan}`
      );
    }

    const durationMonths =
      entitlementService.getDurationMonths(
        payment.plan
      );

    const existing =
      await Subscription.findOne({
        user: payment.user,
      });

    /**
     * Prevent duplicate webhook processing.
     */
    if (
      existing?.lastPaymentReference ===
      payment.reference
    ) {
      console.log(
        `[SUBSCRIPTION] Payment already processed: ${payment.reference}`
      );

      return existing;
    }

    let startsAt = now;
    let expiresAt = addMonths(
      now,
      durationMonths
    );

    /**
     * Active subscriptions keep their
     * original start date and extend
     * from the current expiry.
     */
    if (
      existing?.expiresAt &&
      existing.expiresAt > now
    ) {
      startsAt =
        existing.startsAt ?? now;

      expiresAt = addMonths(
        existing.expiresAt,
        durationMonths
      );
    }

    const subscription =
      await Subscription.findOneAndUpdate(
        {
          user: payment.user,
        },
        {
          user: payment.user,

          plan: payment.plan,

          status: "ACTIVE",

          startsAt,

          expiresAt,

          lastPaymentReference:
            payment.reference,

          updatedAt: now,
        },
        {
          upsert: true,
          new: true,
        }
      );

    console.log(
      `[SUBSCRIPTION] ${payment.user} upgraded to ${payment.plan}. Expires ${expiresAt.toISOString()}`
    );

    return subscription;
  };

/**
 * Cancels a subscription immediately.
 */
export const cancelSubscription =
  async (userId: string) => {
    return Subscription.findOneAndUpdate(
      {
        user: userId,
      },
      {
        status: "CANCELLED",
      },
      {
        new: true,
      }
    );
  };

/**
 * Expires subscriptions whose billing
 * period has ended.
 */
export const expireSubscriptions =
  async () => {
    const now = new Date();

    return Subscription.updateMany(
      {
        status: "ACTIVE",
        expiresAt: {
          $lte: now,
        },
      },
      {
        status: "EXPIRED",
      }
    );
  };

/**
 * Returns the user's active subscription.
 */
export const getActiveSubscription =
  async (userId: string) => {
    return Subscription.findOne({
      user: userId,
      status: "ACTIVE",
    });
  };

/**
 * Returns whether the user currently
 * has an active paid subscription.
 */
export const hasActiveSubscription =
  async (
    userId: string
  ): Promise<boolean> => {
    const subscription =
      await getActiveSubscription(userId);

    if (!subscription) {
      return false;
    }

    if (!subscription.expiresAt) {
      return false;
    }

    return (
      subscription.expiresAt >
      new Date()
    );
  };