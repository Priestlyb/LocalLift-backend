import crypto from "crypto";

import TeamMember from "../../models/TeamMember";

const INVITATION_EXPIRY_HOURS = 72;

class InvitationService {
  /**
   * Generates a secure invitation token.
   */
  generateToken(): string {
    return crypto
      .randomBytes(32)
      .toString("hex");
  }

  /**
   * Returns the invitation expiry date.
   */
  getExpiryDate(): Date {
    const expiry = new Date();

    expiry.setHours(
      expiry.getHours() +
        INVITATION_EXPIRY_HOURS
    );

    return expiry;
  }

  /**
   * Creates a new invitation.
   */
  async createInvitation(data: {
    owner: string;
    business: string;
    invitedBy: string;
    email: string;
    role:
      | "OWNER"
      | "ADMIN"
      | "EDITOR"
      | "VIEWER";
  }) {
    const existing =
      await TeamMember.findOne({
        business: data.business,
        email: data.email
          .trim()
          .toLowerCase(),
        status: {
          $ne: "REMOVED",
        },
      });

    if (existing) {
      throw new Error(
        "This user has already been invited."
      );
    }

    const token =
      this.generateToken();

    return TeamMember.create({
      owner: data.owner,

      business: data.business,

      invitedBy: data.invitedBy,

      email: data.email
        .trim()
        .toLowerCase(),

      role: data.role,

      status: "PENDING",

      invitationToken: token,

      invitationExpiresAt:
        this.getExpiryDate(),
    });
  }

  /**
   * Finds an invitation by token.
   */
  async getInvitation(
    token: string
  ) {
    return TeamMember.findOne({
      invitationToken: token,
    });
  }

  /**
   * Checks whether an invitation
   * is still valid.
   */
  async validateInvitation(
    token: string
  ) {
    const invitation =
      await this.getInvitation(
        token
      );

    if (!invitation) {
      throw new Error(
        "Invitation not found."
      );
    }

    if (
      invitation.status !==
      "PENDING"
    ) {
      throw new Error(
        "Invitation is no longer valid."
      );
    }

    if (
      !invitation.invitationExpiresAt ||
      invitation.invitationExpiresAt <
        new Date()
    ) {
      throw new Error(
        "Invitation has expired."
      );
    }

    return invitation;
  }

  /**
   * Accepts an invitation.
   */
  async acceptInvitation(
    token: string,
    userId: string
  ) {
    const invitation =
      await this.validateInvitation(
        token
      );

    invitation.user = userId as any;

    invitation.status = "ACTIVE";

    invitation.acceptedAt =
      new Date();

    invitation.invitationToken =
      null;

    invitation.invitationExpiresAt =
      null;

    await invitation.save();

    return invitation;
  }

  /**
   * Revokes an invitation.
   */
  async revokeInvitation(
    invitationId: string
  ) {
    return TeamMember.findByIdAndUpdate(
      invitationId,
      {
        status: "REMOVED",

        invitationToken: null,

        invitationExpiresAt:
          null,
      },
      {
        new: true,
      }
    );
  }

  /**
   * Generates a fresh invitation token.
   */
  async resendInvitation(
    invitationId: string
  ) {
    const invitation =
      await TeamMember.findById(
        invitationId
      );

    if (!invitation) {
      throw new Error(
        "Invitation not found."
      );
    }

    if (
      invitation.status !==
      "PENDING"
    ) {
      throw new Error(
        "Only pending invitations can be resent."
      );
    }

    invitation.invitationToken =
      this.generateToken();

    invitation.invitationExpiresAt =
      this.getExpiryDate();

    await invitation.save();

    return invitation;
  }

  /**
   * Deletes expired invitations.
   */
  async cleanupExpiredInvitations() {
    return TeamMember.deleteMany({
      status: "PENDING",

      invitationExpiresAt: {
        $lt: new Date(),
      },
    });
  }
}

export default new InvitationService();