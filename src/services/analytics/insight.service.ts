import Business from "../../models/Business";
import Analytics from "../../models/Analytics";

class InsightService {
  /**
   * Ensures the business belongs to
   * the authenticated user.
   */
  private async verifyBusinessOwnership(
    ownerId: string,
    businessId: string
  ) {
    const business =
      await Business.findOne({
        _id: businessId,
        owner: ownerId,
      });

    if (!business) {
      throw new Error(
        "Business not found."
      );
    }

    return business;
  }

  /**
   * Returns business insights based on
   * current analytics.
   */
  async generateInsights(
    ownerId: string,
    businessId: string
  ) {
    const business =
      await this.verifyBusinessOwnership(
        ownerId,
        businessId
      );

    const analytics =
      await Analytics.find({
        business: business._id,
      });

    if (analytics.length === 0) {
      return [
        {
          type: "INFO",
          title:
            "No analytics available",
          description:
            "Publish content to begin receiving analytics and insights.",
        },
      ];
    }

    const insights: Array<{
      type:
      | "SUCCESS"
      | "WARNING"
      | "INFO";

      title: string;

      description: string;
    }> = [];

    /**
     * Highest engagement platform.
     */
    const bestPlatform =
      analytics.reduce(
        (best, current) =>
          current.engagementRate >
            best.engagementRate
            ? current
            : best
      );

    insights.push({
      type: "SUCCESS",

      title:
        "Best Performing Platform",

      description: `${bestPlatform.platform} currently has your highest engagement rate (${bestPlatform.engagementRate.toFixed(
        2
      )}%).`,
    });

    /**
     * Low engagement warning.
     */
    const averageEngagement =
      analytics.reduce(
        (sum, item) =>
          sum +
          item.engagementRate,
        0
      ) / analytics.length;

    if (
      averageEngagement < 3
    ) {
      insights.push({
        type: "WARNING",

        title:
          "Low Engagement",

        description:
          "Your average engagement is below 3%. Try improving captions, visuals, and posting consistency.",
      });
    } else {
      insights.push({
        type: "SUCCESS",

        title:
          "Healthy Engagement",

        description:
          "Your audience is engaging well with your content.",
      });
    }

    /**
     * Most viewed post.
     */
    const topReach =
      analytics.reduce(
        (best, current) =>
          current.reach >
            best.reach
            ? current
            : best
      );

    insights.push({
      type: "INFO",

      title:
        "Highest Reach",

      description: `One of your ${topReach.platform} posts reached ${topReach.reach.toLocaleString()} people.`,
    });

    /**
     * Click-through performance.
     */
    const totalClicks =
      analytics.reduce(
        (sum, item) =>
          sum + item.clicks,
        0
      );

    if (totalClicks > 0) {
      insights.push({
        type: "SUCCESS",

        title:
          "Audience Interest",

        description: `Your content generated ${totalClicks.toLocaleString()} profile or website clicks.`,
      });
    }

    /**
     * Shares indicate valuable content.
     */
    const totalShares =
      analytics.reduce(
        (sum, item) =>
          sum + item.shares,
        0
      );

    if (totalShares > 50) {
      insights.push({
        type: "SUCCESS",

        title:
          "Highly Shareable Content",

        description:
          "Your audience is actively sharing your posts. Consider creating more content in a similar style.",
      });
    }

    /**
     * Saves indicate educational value.
     */
    const totalSaves =
      analytics.reduce(
        (sum, item) =>
          sum + item.saves,
        0
      );

    if (totalSaves > 20) {
      insights.push({
        type: "SUCCESS",

        title:
          "Content Worth Saving",

        description:
          "Your posts are being saved frequently, which usually indicates valuable or educational content.",
      });
    }

    return insights;
  }

  /**
   * Returns the best performing platform.
   */
  async getBestPlatform(
    ownerId: string,
    businessId: string
  ) {
    const business =
      await this.verifyBusinessOwnership(
        ownerId,
        businessId
      );

    const analytics =
      await Analytics.find({
        business: business._id,
      }).sort({
        engagementRate: -1,
      });

    return analytics[0] ?? null;
  }

  /**
   * Returns the best performing post.
   */
  async getBestContent(
    ownerId: string,
    businessId: string
  ) {
    const business =
      await this.verifyBusinessOwnership(
        ownerId,
        businessId
      );

    return Analytics.findOne({
      business: business._id,
    })
      .populate(
        "content",
        "caption imageUrl"
      )
      .sort({
        engagementRate: -1,
      });
  }

  /**
   * Returns overall engagement score.
   */
  async getEngagementScore(
    ownerId: string,
    businessId: string
  ) {
    const business =
      await this.verifyBusinessOwnership(
        ownerId,
        businessId
      );

    const analytics =
      await Analytics.find({
        business: business._id,
      });

    if (
      analytics.length === 0
    ) {
      return 0;
    }

    const total =
      analytics.reduce(
        (sum, item) =>
          sum +
          item.engagementRate,
        0
      );

    return Number(
      (
        total /
        analytics.length
      ).toFixed(2)
    );
  }
}

export default new InsightService();