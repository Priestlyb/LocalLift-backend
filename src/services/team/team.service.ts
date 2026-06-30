import TeamMember, {
  ITeamMember,
  TeamRole,
} from "../../models/TeamMember";

class TeamService {
  /**
   * Returns every team member
   * belonging to a business.
   */
  async getMembers(
    businessId: string
  ) {
    return TeamMember.find({
      business: businessId,
      status: {
        $ne: "REMOVED",
      },
    })
      .populate(
        "user",
        "firstName lastName email"
      )
      .populate(
        "invitedBy",
        "firstName lastName email"
      )
      .sort({
        createdAt: 1,
      });
  }

  /**
   * Returns one member.
   */
  async getMember(
    memberId: string
  ) {
    return TeamMember.findById(
      memberId
    )
      .populate(
        "user",
        "firstName lastName email"
      )
      .populate(
        "invitedBy",
        "firstName lastName email"
      );
  }

  /**
   * Finds a member using the
   * registered user account.
   */
  async getMemberByUser(
    userId: string
  ) {
    return TeamMember.findOne({
      user: userId,
      status: "ACTIVE",
    });
  }

  /**
   * Finds a member by email.
   */
  async getMemberByEmail(
    businessId: string,
    email: string
  ) {
    return TeamMember.findOne({
      business: businessId,
      email: email
        .trim()
        .toLowerCase(),
    });
  }

  /**
   * Creates a pending invitation.
   */
  async createInvitation(
    data: Partial<ITeamMember>
  ) {
    return TeamMember.create(data);
  }

  /**
   * Marks an invitation as accepted.
   */
  async acceptInvitation(
    memberId: string,
    userId: string
  ) {
    return TeamMember.findByIdAndUpdate(
      memberId,
      {
        user: userId,

        status: "ACTIVE",

        acceptedAt: new Date(),

        invitationToken: null,

        invitationExpiresAt: null,
      },
      {
        new: true,
      }
    );
  }

  /**
   * Changes a member role.
   */
  async updateRole(
    memberId: string,
    role: TeamRole
  ) {
    return TeamMember.findByIdAndUpdate(
      memberId,
      {
        role,
      },
      {
        new: true,
      }
    );
  }

  /**
   * Removes a member from
   * the business.
   */
  async removeMember(
    memberId: string
  ) {
    return TeamMember.findByIdAndUpdate(
      memberId,
      {
        status: "REMOVED",
      },
      {
        new: true,
      }
    );
  }

  /**
   * Restores a removed member.
   */
  async restoreMember(
    memberId: string
  ) {
    return TeamMember.findByIdAndUpdate(
      memberId,
      {
        status: "ACTIVE",
      },
      {
        new: true,
      }
    );
  }

  /**
   * Updates the member's
   * last activity timestamp.
   */
  async updateLastActive(
    userId: string
  ) {
    return TeamMember.findOneAndUpdate(
      {
        user: userId,
      },
      {
        lastActiveAt: new Date(),
      }
    );
  }

  /**
   * Cancels an invitation.
   */
  async cancelInvitation(
    memberId: string
  ) {
    return TeamMember.findByIdAndDelete(
      memberId
    );
  }

  /**
   * Returns the number of active
   * team members.
   */
  async countMembers(
    businessId: string
  ) {
    return TeamMember.countDocuments({
      business: businessId,
      status: "ACTIVE",
    });
  }

  /**
   * Returns whether a user belongs
   * to a business.
   */
  async isMember(
    businessId: string,
    userId: string
  ): Promise<boolean> {
    const member =
      await TeamMember.findOne({
        business: businessId,
        user: userId,
        status: "ACTIVE",
      });

    return !!member;
  }

  /**
   * Returns whether the user
   * owns the business.
   */
  async isOwner(
    businessId: string,
    userId: string
  ): Promise<boolean> {
    const member =
      await TeamMember.findOne({
        business: businessId,
        user: userId,
        role: "OWNER",
        status: "ACTIVE",
      });

    return !!member;
  }

  /**
   * Returns whether the user
   * is an administrator.
   */
  async isAdmin(
    businessId: string,
    userId: string
  ): Promise<boolean> {
    const member =
      await TeamMember.findOne({
        business: businessId,
        user: userId,
        role: {
          $in: [
            "OWNER",
            "ADMIN",
          ],
        },
        status: "ACTIVE",
      });

    return !!member;
  }
}

export default new TeamService();