import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type ScheduledPostStatus =
  | "PENDING"
  | "PROCESSING"
  | "PUBLISHED"
  | "FAILED"
  | "CANCELLED";

export interface IScheduledPost
  extends Document {
  owner: mongoose.Types.ObjectId;

  business: mongoose.Types.ObjectId;

  content: mongoose.Types.ObjectId;

  caption: string;

  hashtags: string[];

  imageUrl: string;

  platforms: string[];

  scheduledFor: Date;

  timezone: string;

  status: ScheduledPostStatus;

  publishedAt?: Date;

  retryCount: number;

  lastError?: string;

  isDeleted: boolean;

  createdAt: Date;

  updatedAt: Date;
}

const scheduledPostSchema =
  new Schema<IScheduledPost>(
    {
      owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      business: {
        type: Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        index: true,
      },

      /**
       * Generated content.
       */
      content: {
        type: Schema.Types.ObjectId,
        ref: "Content",
        required: true,
      },

      caption: {
        type: String,
        default: "",
      },

      hashtags: [
        {
          type: String,
        },
      ],

      imageUrl: {
        type: String,
        required: true,
      },

      /**
       * Future support:
       * instagram
       * facebook
       * linkedin
       * x
       * tiktok
       */
      platforms: [
        {
          type: String,
          required: true,
        },
      ],

      scheduledFor: {
        type: Date,
        required: true,
        index: true,
      },

      timezone: {
        type: String,
        default: "Africa/Lagos",
      },

      status: {
        type: String,
        enum: [
          "PENDING",
          "PROCESSING",
          "PUBLISHED",
          "FAILED",
          "CANCELLED",
        ],
        default: "PENDING",
        index: true,
      },

      publishedAt: {
        type: Date,
      },

      retryCount: {
        type: Number,
        default: 0,
      },

      lastError: {
        type: String,
        default: "",
      },

      isDeleted: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model<IScheduledPost>(
  "ScheduledPost",
  scheduledPostSchema
);