import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type TeamRole =
  | "OWNER"
  | "ADMIN"
  | "EDITOR"
  | "VIEWER";

export type TeamStatus =
  | "PENDING"
  | "ACTIVE"
  | "REMOVED";

export interface ITeamMember
  extends Document {
  owner: mongoose.Types.ObjectId;

  business: mongoose.Types.ObjectId;

  user?: mongoose.Types.ObjectId;

  invitedBy: mongoose.Types.ObjectId;

  email: string;

  role: TeamRole;

  status: TeamStatus;

  invitationToken?: string | null;

  invitationExpiresAt?: Date | null;

  acceptedAt?: Date | null;

  lastActiveAt?: Date | null;
}

const teamMemberSchema =
  new Schema<ITeamMember>(
    {
      owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      business: {
        type: Schema.Types.ObjectId,
        ref: "Business",
        required: true,
      },
      
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      invitedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },

      role: {
        type: String,
        enum: [
          "OWNER",
          "ADMIN",
          "EDITOR",
          "VIEWER",
        ],
        default: "EDITOR",
      },

      status: {
        type: String,
        enum: [
          "PENDING",
          "ACTIVE",
          "REMOVED",
        ],
        default: "PENDING",
      },

      invitationToken: {
        type: String,
        default: null,
        index: true,
      },

      invitationExpiresAt: {
        type: Date,
        default: null,
      },

      acceptedAt: {
        type: Date,
        default: null,
      },

      lastActiveAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

/**
 * Prevent duplicate invitations
 * to the same business.
 */
teamMemberSchema.index(
  {
    business: 1,
    email: 1,
  },
  {
    unique: true,
  }
);

/**
 * Faster lookups when loading
 * a user's team memberships.
 */
teamMemberSchema.index({
  user: 1,
});

/**
 * Faster business member lists.
 */
teamMemberSchema.index({
  business: 1,
  status: 1,
});

export default mongoose.model<ITeamMember>(
  "TeamMember",
  teamMemberSchema
);