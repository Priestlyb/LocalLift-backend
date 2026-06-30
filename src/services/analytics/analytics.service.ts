import mongoose from "mongoose";

import Analytics, {
  IAnalytics,
  SocialPlatform,
} from "../../models/Analytics";

import Business from "../../models/Business";
import Content from "../../models/Content";

class AnalyticsService {
  /**
   * Creates or updates analytics for a
   * content/platform combination.
   */
  async upsertAnalytics(
    data: Partial<IAnalytics>
  ) {
    return Analytics.findOneAndUpdate(
      {
        content: data.content,
        platform: data.platform,
      },
      {
        ...data,
        fetchedAt: new Date(),
      },
      {
        new: true,
        upsert: true,
      }
    );
  }

  /**
   * Returns analytics for a single
   * content item.
   */
  async getContentAnalytics(
    ownerId: string,
    contentId: string
  ) {
    const content =
      await Content.findOne({
        _id: contentId,
        user: ownerId,
      });

    if (!content) {
      throw new Error(
        "Content not found."
      );
    }

    return Analytics.find({
      content: content._id,
    }).sort({
      platform: 1,
    });
  }

  /**
   * Returns analytics for a business.
   */
  async getBusinessAnalytics(
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

    return Analytics.find({
      business: business._id,
    }).sort({
      createdAt: -1,
    });
  }

  /**
   * Returns analytics belonging to
   * a specific user.
   */
  async getUserAnalytics(
    ownerId: string
  ) {
    return Analytics.find({
      owner:
        new mongoose.Types.ObjectId(
          ownerId
        ),
    }).sort({
      createdAt: -1,
    });
  }

  /**
   * Returns analytics for a
   * specific platform.
   */
  async getPlatformAnalytics(
    ownerId: string,
    businessId: string,
    platform: SocialPlatform
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

    return Analytics.find({
      business: business._id,
      platform,
    }).sort({
      createdAt: -1,
    });
  }

  /**
   * Returns dashboard totals.
   */
  async getSummary(
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

    const result =
      await Analytics.aggregate([
        {
          $match: {
            business: business._id,
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
              $avg:
                "$engagementRate",
            },
          },
        },
      ]);

    return (
      result[0] ?? {
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
   * Deletes analytics for a content item.
   */
  async deleteContentAnalytics(
    ownerId: string,
    contentId: string
  ) {
    const content =
      await Content.findOne({
        _id: contentId,
        user: ownerId,
      });

    if (!content) {
      throw new Error(
        "Content not found."
      );
    }

    return Analytics.deleteMany({
      content: content._id,
    });
  }

  /**
   * Deletes a single analytics record.
   */
  async deleteAnalytics(
    analyticsId: string
  ) {
    return Analytics.findByIdAndDelete(
      analyticsId
    );
  }
}

export default new AnalyticsService();