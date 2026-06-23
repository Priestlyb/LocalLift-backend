import mongoose from "mongoose";

const usageSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        currentMonth: {
            type: String,
            required: true,
        },

        generationsUsed: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model(
    "Usage",
    usageSchema
);