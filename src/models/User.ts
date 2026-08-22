import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

import bcrypt from "bcryptjs";

export type UserRole =
  | "ADMIN"
  | "CUSTOMER"
  | "CUSTOMER_STAFF";

export type AuthProvider =
  | "local"
  | "google"
  | "apple";

export interface IUser
  extends Document {
  name: string;
  email: string;
  password?: string;
  avatar?: string | null;

  provider: AuthProvider;

  googleId?: string | null;
  appleId?: string | null;

  role: UserRole;

  owner: mongoose.Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;

  /**
   * Compare a plain-text password
   * against the user's password hash.
   */
  comparePassword(
    candidatePassword: string
  ): Promise<boolean>;
}

const userSchema =
  new Schema<IUser>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 254,
        index: true,
      },

      /**
       * Password is optional because
       * social-auth accounts may not have
       * a local password.
       */
      password: {
        type: String,
        required: false,
        select: false,
      },

      avatar: {
        type: String,
        default: null,
        maxlength: 2048,
      },

      provider: {
        type: String,
        enum: [
          "local",
          "google",
          "apple",
        ],
        default: "local",
        required: true,
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
        required: true,
      },

      /**
       * CUSTOMER_STAFF accounts belong
       * to a CUSTOMER/business owner.
       */
      owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
      strict: true,
    }
  );

/**
 * Normalize email before validation/save.
 */
userSchema.pre(
  "save",
  async function () {
    /**
     * Only hash the password when it
     * has actually been modified.
     */
    if (
      !this.isModified("password") ||
      !this.password
    ) {
      return;
    }

    this.password =
      await bcrypt.hash(
        this.password,
        12
      );
  }
);

/**
 * Prevent passwords from accidentally
 * being returned by normal queries.
 *
 * Passwords must be explicitly requested:
 *
 * User.findOne({ email }).select("+password")
 */
userSchema.methods.comparePassword =
  async function (
    candidatePassword: string
  ): Promise<boolean> {
    if (!this.password) {
      return false;
    }

    return bcrypt.compare(
      candidatePassword,
      this.password
    );
  };

/**
 * Prevent sensitive fields from being
 * returned through JSON serialization.
 */
userSchema.set(
  "toJSON",
  {
    transform: (
      _doc,
      ret
    ) => {
      delete ret.password;
      delete ret.googleId;
      delete ret.appleId;

      return ret;
    },
  }
);

const User: Model<IUser> =
  mongoose.model<IUser>(
    "User",
    userSchema
  );

export default User;