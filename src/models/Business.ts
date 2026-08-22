import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface IBusiness
  extends Document {
  owner: mongoose.Types.ObjectId;

  // Basic Business Information
  businessName: string;
  category: string;
  description: string;

  // AI / Marketing Context
  targetAudience: string;
  uniqueSellingPoint: string;
  brandVoice: string;

  // Contact Information
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  website: string;

  // Branding
  logo: string;
  primaryColor: string;
  secondaryColor: string;

  // Social Media
  facebook: string;
  instagram: string;
  linkedin: string;
  tiktok: string;
  x: string;

  // Status
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const businessSchema =
  new Schema<IBusiness>(
    {
      /**
       * Owner
       */
      owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
      },

      /**
       * Basic Business Information
       */
      businessName: {
        type: String,
        required: true,
        trim: true,
      },

      category: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      /**
       * AI / Marketing Context
       */
      targetAudience: {
        type: String,
        default: "",
        trim: true,
      },

      uniqueSellingPoint: {
        type: String,
        default: "",
        trim: true,
      },

      brandVoice: {
        type: String,
        default: "Professional",
        trim: true,
      },

      /**
       * Contact Information
       */
      phone: {
        type: String,
        default: "",
        trim: true,
      },

      email: {
        type: String,
        default: "",
        lowercase: true,
        trim: true,
      },

      website: {
        type: String,
        default: "",
        trim: true,
      },

      /**
       * Address
       */
      address: {
        type: String,
        default: "",
        trim: true,
      },

      city: {
        type: String,
        default: "",
        trim: true,
      },

      state: {
        type: String,
        default: "",
        trim: true,
      },

      country: {
        type: String,
        default: "",
        trim: true,
      },

      /**
       * Branding
       */
      logo: {
        type: String,
        default: "",
        trim: true,
      },

      primaryColor: {
        type: String,
        default: "#000000",
        trim: true,
      },

      secondaryColor: {
        type: String,
        default: "#FFFFFF",
        trim: true,
      },

      /**
       * Social Media
       */
      facebook: {
        type: String,
        default: "",
        trim: true,
      },

      instagram: {
        type: String,
        default: "",
        trim: true,
      },

      linkedin: {
        type: String,
        default: "",
        trim: true,
      },

      tiktok: {
        type: String,
        default: "",
        trim: true,
      },

      x: {
        type: String,
        default: "",
        trim: true,
      },

      /**
       * Business Status
       */
      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model<IBusiness>(
  "Business",
  businessSchema
);