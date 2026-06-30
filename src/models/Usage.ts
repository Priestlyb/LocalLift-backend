import mongoose, {
    Document,
    Schema,
} from "mongoose";

export interface IUsage
    extends Document {
    user: mongoose.Types.ObjectId;

    /**
     * AI image generations used
     * during the current billing cycle.
     */
    imageGenerationsUsed: number;

    /**
     * Number of downloads.
     */
    downloadsUsed: number;

    /**
     * Number of scheduled posts.
     */
    scheduledPostsUsed: number;

    /**
     * API requests made.
     */
    apiRequestsUsed: number;

    /**
     * When usage resets.
     */
    nextResetAt: Date;
}

const usageSchema =
    new Schema<IUsage>(
        {
            user: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
                unique: true,
                index: true,
            },

            imageGenerationsUsed: {
                type: Number,
                default: 0,
                min: 0,
            },

            downloadsUsed: {
                type: Number,
                default: 0,
                min: 0,
            },

            scheduledPostsUsed: {
                type: Number,
                default: 0,
                min: 0,
            },

            apiRequestsUsed: {
                type: Number,
                default: 0,
                min: 0,
            },

            nextResetAt: {
                type: Date,
                required: true,
            },
        },
        {
            timestamps: true,
        }
    );

export default mongoose.model<IUsage>(
    "Usage",
    usageSchema
);