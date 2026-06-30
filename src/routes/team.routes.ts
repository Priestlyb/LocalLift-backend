import { Router } from "express";

import teamController from "../controllers/team.controller";

import {
  protect,
  authorize,
} from "../middleware/auth.middleware";

import requireSubscription from "../middleware/requireSubscription.middleware";
import requireTeam from "../middleware/requireTeam.middleware";

const router = Router();

/**
 * Every Team route requires:
 * - Authentication
 * - Active subscription
 * - Team feature access
 */
router.use(
  protect,
  authorize(
    "CUSTOMER"
  ),
  requireSubscription,
  requireTeam
);

/**
 * Invite a team member.
 */
router.post(
  "/invite",
  teamController.inviteMember
);

/**
 * Accept an invitation.
 */
router.post(
  "/accept/:token",
  teamController.acceptInvitation
);

/**
 * Resend an invitation.
 */
router.patch(
  "/invite/:id/resend",
  teamController.resendInvitation
);

/**
 * Revoke an invitation.
 */
router.delete(
  "/invite/:id",
  teamController.revokeInvitation
);

/**
 * Get all members for a business.
 */
router.get(
  "/business/:businessId",
  teamController.getMembers
);

/**
 * Count active members.
 */
router.get(
  "/business/:businessId/count",
  teamController.countMembers
);

/**
 * Get one member.
 */
router.get(
  "/:id",
  teamController.getMember
);

/**
 * Update a member's role.
 */
router.patch(
  "/:id/role",
  teamController.updateRole
);

/**
 * Remove a member.
 */
router.delete(
  "/:id",
  teamController.removeMember
);

/**
 * Restore a removed member.
 */
router.patch(
  "/:id/restore",
  teamController.restoreMember
);

export default router;