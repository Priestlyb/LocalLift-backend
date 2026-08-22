import Usage from "../../models/Usage";
import Subscription from "../../models/Subscription";
import entitlementService from "./entitlement.service";

type UsagePlan =
  | "FREE"
  | "STARTER"
  | "GROWTH"
  | "PRO";

const DEFAULT_FREE_DURATION_MONTHS = 1;

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

const resetUsageCounters = (
  usage: any
) => {
  usage.imageGenerationsUsed = 0;
  usage.downloadsUsed = 0;
  usage.scheduledPostsUsed = 0;
  usage.apiRequestsUsed = 0;
};

class UsageService {
  /**
   * Returns the user's current plan.
   *
   * If the user has an ACTIVE subscription,
   * use that subscription's plan.
   *
   * Otherwise, the user is considered FREE.
   */
  private getCurrentPlan(
    subscription: any
  ): UsagePlan {
    if (
      subscription?.status === "ACTIVE"
    ) {
      switch (subscription.plan) {
        case "STARTER":
        case "GROWTH":
        case "PRO":
          return subscription.plan;

        default:
          return "FREE";
      }
    }

    return "FREE";
  }

  /**
   * Returns the billing/reset duration
   * for the current plan.
   *
   * Paid plans use the subscription's
   * configured duration.
   *
   * FREE uses a one-month usage cycle.
   */
  private getDurationMonths(
    subscription: any,
    plan: UsagePlan
  ): number {
    if (
      plan !== "FREE" &&
      subscription?.durationMonths
    ) {
      return subscription.durationMonths;
    }

    return DEFAULT_FREE_DURATION_MONTHS;
  }

  /**
   * Returns the user's usage record,
   * creating or resetting it when necessary.
   *
   * Supports:
   *
   * FREE
   * STARTER
   * GROWTH
   * PRO
   */
  async getOrCreateUsage(
    userId: string
  ) {
    const now = new Date();

    /**
     * Only ACTIVE subscriptions are
     * considered when determining the
     * current paid plan.
     *
     * If no active subscription exists,
     * the user automatically falls back
     * to FREE.
     */
    const subscription =
      await Subscription.findOne({
        user: userId,
        status: "ACTIVE",
      });

    const plan =
      this.getCurrentPlan(
        subscription
      );

    const durationMonths =
      this.getDurationMonths(
        subscription,
        plan
      );

    /**
     * Paid subscriptions use their
     * actual startsAt date.
     *
     * FREE users start their usage
     * cycle from the current date.
     */
    const cycleStart =
      plan === "FREE"
        ? now
        : (
          subscription?.startsAt ??
          now
        );

    let usage =
      await Usage.findOne({
        user: userId,
      });

    /**
     * First usage record for this user.
     *
     * This works for both FREE and
     * paid users.
     */
    if (!usage) {
      usage = await Usage.create({
        user: userId,

        imageGenerationsUsed: 0,

        downloadsUsed: 0,

        scheduledPostsUsed: 0,

        apiRequestsUsed: 0,

        nextResetAt: addMonths(
          cycleStart,
          durationMonths
        ),
      });

      return usage;
    }

    /**
     * IMPORTANT:
     *
     * If the user's existing usage
     * period has already expired,
     * reset it before returning it.
     */
    let updated = false;

    /**
     * If there is an active paid
     * subscription and its start date
     * is after the current usage period,
     * realign the usage cycle.
     *
     * This handles:
     *
     * - New subscriptions
     * - Renewals
     * - Re-subscriptions
     */
    if (
      plan !== "FREE" &&
      subscription?.startsAt &&
      usage.nextResetAt <
      subscription.startsAt
    ) {
      resetUsageCounters(
        usage
      );

      usage.nextResetAt =
        addMonths(
          subscription.startsAt,
          durationMonths
        );

      updated = true;
    }

    /**
     * Reset usage whenever the current
     * usage period has expired.
     *
     * The while loop protects against
     * users who have not accessed the
     * application for multiple cycles.
     */
    while (
      now >= usage.nextResetAt
    ) {
      resetUsageCounters(
        usage
      );

      usage.nextResetAt =
        addMonths(
          usage.nextResetAt,
          durationMonths
        );

      updated = true;
    }

    if (updated) {
      await usage.save();
    }

    return usage;
  }

  /**
   * Increment image generation usage.
   *
   * Works for:
   * FREE
   * STARTER
   * GROWTH
   * PRO
   */
  async incrementImageUsage(
    userId: string
  ) {
    const usage =
      await this.getOrCreateUsage(
        userId
      );

    usage.imageGenerationsUsed += 1;

    await usage.save();

    return usage;
  }

  /**
   * Increment download usage.
   */
  async incrementDownloadUsage(
    userId: string
  ) {
    const usage =
      await this.getOrCreateUsage(
        userId
      );

    usage.downloadsUsed += 1;

    await usage.save();

    return usage;
  }

  /**
   * Increment scheduled post usage.
   */
  async incrementSchedulerUsage(
    userId: string
  ) {
    const usage =
      await this.getOrCreateUsage(
        userId
      );

    usage.scheduledPostsUsed += 1;

    await usage.save();

    return usage;
  }

  /**
   * Increment API request usage.
   */
  async incrementApiUsage(
    userId: string
  ) {
    const usage =
      await this.getOrCreateUsage(
        userId
      );

    usage.apiRequestsUsed += 1;

    await usage.save();

    return usage;
  }

  /**
   * Returns remaining image generations
   * for the user's current plan.
   *
   * Supports:
   *
   * FREE
   * STARTER
   * GROWTH
   * PRO
   */
  async getRemainingImageGenerations(
    userId: string,
    plan: Parameters<
      typeof entitlementService.getImageLimit
    >[0]
  ) {
    const usage =
      await this.getOrCreateUsage(
        userId
      );

    const limit =
      entitlementService.getImageLimit(
        plan
      );

    return Math.max(
      limit -
      usage.imageGenerationsUsed,
      0
    );
  }

  /**
   * Returns the user's current usage.
   *
   * Works for FREE and paid users.
   */
  async getUsage(
    userId: string
  ) {
    return this.getOrCreateUsage(
      userId
    );
  }

  /**
   * Resets usage immediately.
   *
   * Useful for:
   *
   * - Testing
   * - Admin tools
   * - Manual account resets
   */
  async resetUsage(
    userId: string
  ) {
    const usage =
      await this.getOrCreateUsage(
        userId
      );

    resetUsageCounters(
      usage
    );

    /**
     * Determine the current plan so
     * the next usage period is created
     * correctly.
     */
    const subscription =
      await Subscription.findOne({
        user: userId,
        status: "ACTIVE",
      });

    const plan =
      this.getCurrentPlan(
        subscription
      );

    const durationMonths =
      this.getDurationMonths(
        subscription,
        plan
      );

    usage.nextResetAt =
      addMonths(
        new Date(),
        durationMonths
      );

    await usage.save();

    return usage;
  }
}

export default new UsageService();