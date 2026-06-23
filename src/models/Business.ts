import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        businessName: {
            type: String,
            required: true,
            trim: true,
        },

        category: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            default: "",
        },

        targetAudience: {
            type: String,
            default: "",
        },

        uniqueSellingPoint: {
            type: String,
            default: "",
        },

        brandVoice: {
            type: String,
            default: "",
        },

        phone: {
            type: String,
            default: "",
        },

        email: {
            type: String,
            default: "",
        },

        address: {
            type: String,
            default: "",
        },

        city: {
            type: String,
            default: "",
        },

        state: {
            type: String,
            default: "",
        },

        country: {
            type: String,
            default: "",
        },

        website: {
            type: String,
            default: "",
        },

        logo: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model(
    "Business",
    businessSchema
);