import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface IBusiness
  extends Document {
  owner: mongoose.Types.ObjectId;

  businessName: string;
  category: string;
  description: string;

  targetAudience: string;
  uniqueSellingPoint: string;
  brandVoice: string;

  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  website: string;

  logo: string;

  primaryColor: string;
  secondaryColor: string;

  facebook: string;
  instagram: string;
  x: string;
  linkedin: string;
  tiktok: string;

  isActive: boolean;
}

const businessSchema =
  new Schema<IBusiness>(
    {
      owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
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
        index: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      /**
       * AI Context
       */
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
        default: "Professional",
      },

      /**
       * Contact
       */
      phone: {
        type: String,
        default: "",
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

      /**
       * Branding
       */
      logo: {
        type: String,
        default: "",
      },

      primaryColor: {
        type: String,
        default: "#000000",
      },

      secondaryColor: {
        type: String,
        default: "#FFFFFF",
      },

      /**
       * Social Media
       */
      facebook: {
        type: String,
        default: "",
      },

      instagram: {
        type: String,
        default: "",
      },

      x: {
        type: String,
        default: "",
      },

      linkedin: {
        type: String,
        default: "",
      },

      tiktok: {
        type: String,
        default: "",
      },

      /**
       * Soft disable.
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