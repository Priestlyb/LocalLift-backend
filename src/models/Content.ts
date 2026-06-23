import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        business: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Business",
            required: true,
        },

        type: {
            type: String,
            enum: [
                "SOCIAL_POST",
                "PROMOTION",
                "PRODUCT_DESCRIPTION",
            ],
            required: true,
        },

        prompt: {
            type: String,
            required: true,
        },

        generatedContent: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model(
    "Content",
    contentSchema
);