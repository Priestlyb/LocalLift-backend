import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

export type SocialPlatform =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "X"
  | "LINKEDIN"
  | "TIKTOK";

export interface IAnalytics
  extends Document {
  owner: mongoose.Types.ObjectId;

  business: mongoose.Types.ObjectId;

  content: mongoose.Types.ObjectId;

  platform: SocialPlatform;

  impressions: number;

  reach: number;

  likes: number;

  comments: number;

  shares: number;

  saves: number;

  clicks: number;

  engagementRate: number;

  publishedAt?: Date | null;

  fetchedAt: Date;

  createdAt: Date;

  updatedAt: Date;
}

const analyticsSchema =
  new Schema<IAnalytics>(
    {
      owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      business: {
        type: Schema.Types.ObjectId,
        ref: "Business",
        required: true,
      },

      content: {
        type: Schema.Types.ObjectId,
        ref: "Content",
        required: true,
      },

      platform: {
        type: String,
        enum: [
          "FACEBOOK",
          "INSTAGRAM",
          "X",
          "LINKEDIN",
          "TIKTOK",
        ],
        required: true,
      },

      impressions: {
        type: Number,
        default: 0,
      },

      reach: {
        type: Number,
        default: 0,
      },

      likes: {
        type: Number,
        default: 0,
      },

      comments: {
        type: Number,
        default: 0,
      },

      shares: {
        type: Number,
        default: 0,
      },

      saves: {
        type: Number,
        default: 0,
      },

      clicks: {
        type: Number,
        default: 0,
      },

      engagementRate: {
        type: Number,
        default: 0,
      },

      publishedAt: {
        type: Date,
        default: null,
      },

      fetchedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

/**
 * One analytics document exists
 * per content-platform pair.
 */
analyticsSchema.index(
  {
    content: 1,
    platform: 1,
  },
  {
    unique: true,
  }
);

/**
 * Faster business dashboards.
 */
analyticsSchema.index({
  business: 1,
  createdAt: -1,
});

/**
 * Faster platform reports.
 */
analyticsSchema.index({
  business: 1,
  platform: 1,
});

/**
 * Faster owner lookups.
 */
analyticsSchema.index({
  owner: 1,
});

const Analytics: Model<IAnalytics> =
  (mongoose.models.Analytics as Model<IAnalytics>) ||
  mongoose.model<IAnalytics>(
    "Analytics",
    analyticsSchema
  );

export default Analytics;