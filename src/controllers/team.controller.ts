import {
  Request,
  Response,
  NextFunction,
} from "express";

import { AuthRequest } from "../middleware/auth.middleware";

import teamService from "../services/team/team.service";
import invitationService from "../services/team/invitation.service";

import { getParam } from "../utils/request";

class TeamController {
  /**
   * Invite a new team member.
   */
  async inviteMember(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const invitation =
        await invitationService.createInvitation(
          {
            owner: req.userId,

            business:
              req.body.business,

            invitedBy:
              req.userId,

            email: req.body.email,

            role: req.body.role,
          }
        );

      return res.status(201).json({
        success: true,
        message:
          "Invitation created successfully.",
        data: invitation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept an invitation.
   */
  async acceptInvitation(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const member =
        await invitationService.acceptInvitation(
          getParam(req.params.token),
          req.userId
        );

      return res.json({
        success: true,
        message:
          "Invitation accepted successfully.",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend an invitation.
   */
  async resendInvitation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const invitation =
        await invitationService.resendInvitation(
          getParam(req.params.id)
        );

      return res.json({
        success: true,
        message:
          "Invitation resent successfully.",
        data: invitation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke an invitation.
   */
  async revokeInvitation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const invitation =
        await invitationService.revokeInvitation(
          getParam(req.params.id)
        );

      return res.json({
        success: true,
        message:
          "Invitation revoked successfully.",
        data: invitation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns every member of
   * a business.
   */
  async getMembers(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const members =
        await teamService.getMembers(
          getParam(
            req.params.businessId
          )
        );

      return res.json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns one team member.
   */
  async getMember(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const member =
        await teamService.getMember(
          getParam(req.params.id)
        );

      if (!member) {
        return res.status(404).json({
          success: false,
          message:
            "Team member not found.",
        });
      }

      return res.json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates a member role.
   */
  async updateRole(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const member =
        await teamService.updateRole(
          getParam(req.params.id),
          req.body.role
        );

      return res.json({
        success: true,
        message:
          "Role updated successfully.",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Removes a member.
   */
  async removeMember(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const member =
        await teamService.removeMember(
          getParam(req.params.id)
        );

      return res.json({
        success: true,
        message:
          "Member removed successfully.",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restores a removed member.
   */
  async restoreMember(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const member =
        await teamService.restoreMember(
          getParam(req.params.id)
        );

      return res.json({
        success: true,
        message:
          "Member restored successfully.",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns the number of
   * active team members.
   */
  async countMembers(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const count =
        await teamService.countMembers(
          getParam(
            req.params.businessId
          )
        );

      return res.json({
        success: true,
        data: {
          count,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TeamController();