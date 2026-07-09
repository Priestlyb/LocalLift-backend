import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  avatar?: string | null;

  provider: "local" | "google" | "apple";

  googleId?: string | null;
  appleId?: string | null;

  role:
  | "ADMIN"
  | "CUSTOMER"
  | "CUSTOMER_STAFF";

  owner: mongoose.Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: false,
    },

    avatar: {
      type: String,
      default: null,
    },

    provider: {
      type: String,
      enum: [
        "local",
        "google",
        "apple",
      ],
      default: "local",
    },

    googleId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    appleId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    role: {
      type: String,
      enum: [
        "ADMIN",
        "CUSTOMER",
        "CUSTOMER_STAFF",
      ],
      default: "CUSTOMER",
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.model<IUser>(
    "User",
    userSchema
  );

export default User;