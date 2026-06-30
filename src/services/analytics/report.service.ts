import mongoose from "mongoose";

import Analytics from "../../models/Analytics";
import Business from "../../models/Business";

class ReportService {
  /**
   * Verifies that the business belongs
   * to the authenticated user.
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
   * Generates a report between two dates.
   */
  async generateReport(
    ownerId: string,
    businessId: string,
    startDate: Date,
    endDate: Date
  ) {
    const business =
      await this.verifyBusinessOwnership(
        ownerId,
        businessId
      );

    const report =
      await Analytics.aggregate([
        {
          $match: {
            business: business._id,

            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },

        {
          $group: {
            _id: null,

            impressions: {
              $sum: "$impressions",
            },

            reach: {
              $sum: "$reach",
            },

            likes: {
              $sum: "$likes",
            },

            comments: {
              $sum: "$comments",
            },

            shares: {
              $sum: "$shares",
            },

            saves: {
              $sum: "$saves",
            },

            clicks: {
              $sum: "$clicks",
            },

            averageEngagement: {
              $avg: "$engagementRate",
            },
          },
        },
      ]);

    return (
      report[0] ?? {
        impressions: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        clicks: 0,
        averageEngagement: 0,
      }
    );
  }

  /**
   * Weekly report.
   */
  async getWeeklyReport(
    ownerId: string,
    businessId: string
  ) {
    const end = new Date();

    const start = new Date();

    start.setDate(
      start.getDate() - 7
    );

    return this.generateReport(
      ownerId,
      businessId,
      start,
      end
    );
  }

  /**
   * Monthly report.
   */
  async getMonthlyReport(
    ownerId: string,
    businessId: string
  ) {
    const end = new Date();

    const start = new Date();

    start.setMonth(
      start.getMonth() - 1
    );

    return this.generateReport(
      ownerId,
      businessId,
      start,
      end
    );
  }

  /**
   * Returns analytics grouped by platform.
   */
  async getPlatformBreakdown(
    ownerId: string,
    businessId: string
  ) {
    const business =
      await this.verifyBusinessOwnership(
        ownerId,
        businessId
      );

    return Analytics.aggregate([
      {
        $match: {
          business: business._id,
        },
      },

      {
        $group: {
          _id: "$platform",

          impressions: {
            $sum: "$impressions",
          },

          reach: {
            $sum: "$reach",
          },

          likes: {
            $sum: "$likes",
          },

          comments: {
            $sum: "$comments",
          },

          shares: {
            $sum: "$shares",
          },

          saves: {
            $sum: "$saves",
          },

          clicks: {
            $sum: "$clicks",
          },

          averageEngagement: {
            $avg: "$engagementRate",
          },
        },
      },

      {
        $sort: {
          impressions: -1,
        },
      },
    ]);
  }

  /**
   * Returns the best-performing content.
   */
  async getTopPerformingContent(
    ownerId: string,
    businessId: string,
    limit = 10
  ) {
    const business =
      await this.verifyBusinessOwnership(
        ownerId,
        businessId
      );

    return Analytics.find({
      business: business._id,
    })
      .populate(
        "content",
        "caption imageUrl"
      )
      .sort({
        engagementRate: -1,
      })
      .limit(limit);
  }

  /**
   * Returns posting activity by day.
   */
  async getPostingActivity(
    ownerId: string,
    businessId: string
  ) {
    const business =
      await this.verifyBusinessOwnership(
        ownerId,
        businessId
      );

    return Analytics.aggregate([
      {
        $match: {
          business: business._id,
        },
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },

          posts: {
            $sum: 1,
          },

          impressions: {
            $sum: "$impressions",
          },

          engagement: {
            $avg: "$engagementRate",
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ]);
  }
}

export default new ReportService();