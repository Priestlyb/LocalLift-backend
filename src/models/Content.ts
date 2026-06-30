import mongoose, {
  Document,
  Model,
} from "mongoose";

export type ContentType =
  | "SOCIAL_POST"
  | "PROMOTION"
  | "PRODUCT_DESCRIPTION"
  | "IMAGE_POSTER"
  | "VIDEO_AD";

export type MediaType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO";

export type ContentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface IContent
  extends Document {
  user: mongoose.Types.ObjectId;

  business: mongoose.Types.ObjectId;

  type: ContentType;

  mediaType: MediaType;

  status: ContentStatus;

  prompt: string;

  generatedContent: string;

  imageUrl?: string | null;

  videoUrl?: string | null;

  providerId?: string | null;

  error?: string | null;

  metadata: Record<
    string,
    unknown
  >;

  createdAt: Date;

  updatedAt: Date;
}

const contentSchema =
  new mongoose.Schema<IContent>(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        index: true,
      },

      type: {
        type: String,
        enum: [
          "SOCIAL_POST",
          "PROMOTION",
          "PRODUCT_DESCRIPTION",
          "IMAGE_POSTER",
          "VIDEO_AD",
        ],
        required: true,
      },

      mediaType: {
        type: String,
        enum: [
          "TEXT",
          "IMAGE",
          "VIDEO",
        ],
        required: true,
        default: "TEXT",
      },

      status: {
        type: String,
        enum: [
          "PENDING",
          "PROCESSING",
          "COMPLETED",
          "FAILED",
        ],
        default: "PENDING",
        index: true,
      },

      prompt: {
        type: String,
        required: true,
      },

      generatedContent: {
        type: String,
        default: "",
      },

      imageUrl: {
        type: String,
        default: null,
      },

      videoUrl: {
        type: String,
        default: null,
      },

      providerId: {
        type: String,
        default: null,
      },

      error: {
        type: String,
        default: null,
      },

      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    {
      timestamps: true,
    }
  );

contentSchema.index({
  user: 1,
  createdAt: -1,
});

contentSchema.index({
  business: 1,
  createdAt: -1,
});

const Content: Model<IContent> =
  mongoose.model<IContent>(
    "Content",
    contentSchema
  );

export default Content;