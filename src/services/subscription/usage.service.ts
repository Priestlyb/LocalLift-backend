import Usage from "../../models/Usage";
import Subscription from "../../models/Subscription";
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

class UsageService {
  /**
   * Returns the user's usage record,
   * creating or resetting it when necessary.
   */
  async getOrCreateUsage(
    userId: string
  ) {
    const now = new Date();

    const subscription =
      await Subscription.findOne({
        user: userId,
        status: "ACTIVE",
      });

    if (!subscription) {
      throw new Error(
        "No active subscription found."
      );
    }

    const subscriptionStart =
      subscription.startsAt ?? now;

    let usage =
      await Usage.findOne({
        user: userId,
      });

    /**
     * First usage for this account.
     */
    if (!usage) {
      usage = await Usage.create({
        user: userId,

        imageGenerationsUsed: 0,

        downloadsUsed: 0,

        scheduledPostsUsed: 0,

        apiRequestsUsed: 0,

        nextResetAt: addMonths(
          subscriptionStart,
          subscription.durationMonths ??
          1
        ),
      });

      return usage;
    }

    /**
     * Realign usage when a subscription
     * starts again.
     */
    if (
      usage.nextResetAt <
      subscriptionStart
    ) {
      usage.imageGenerationsUsed = 0;

      usage.downloadsUsed = 0;

      usage.scheduledPostsUsed = 0;

      usage.apiRequestsUsed = 0;

      usage.nextResetAt =
        addMonths(
          subscriptionStart,
          subscription.durationMonths ??
          1
        );

      await usage.save();

      return usage;
    }

    /**
     * Reset usage after every billing cycle.
     */
    let updated = false;

    while (
      now >= usage.nextResetAt
    ) {
      usage.imageGenerationsUsed = 0;

      usage.downloadsUsed = 0;

      usage.scheduledPostsUsed = 0;

      usage.apiRequestsUsed = 0;

      usage.nextResetAt =
        addMonths(
          usage.nextResetAt,
          subscription.durationMonths ??
          1
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
   * Increment scheduler usage.
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
   * Increment API usage.
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
   * Returns remaining image generations.
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
   * Useful for testing or admin tools.
   */
  async resetUsage(
    userId: string
  ) {
    const usage =
      await this.getOrCreateUsage(
        userId
      );

    usage.imageGenerationsUsed = 0;

    usage.downloadsUsed = 0;

    usage.scheduledPostsUsed = 0;

    usage.apiRequestsUsed = 0;

    await usage.save();

    return usage;
  }
}

export default new UsageService();