import { TeamRole } from "../../models/TeamMember";

export type TeamPermission =
  | "team.manage"
  | "team.invite"
  | "team.remove"
  | "content.create"
  | "content.edit"
  | "content.delete"
  | "branding.manage"
  | "scheduler.use"
  | "analytics.view"
  | "api.use";

const ROLE_PERMISSIONS: Record<
  TeamRole,
  TeamPermission[]
> = {
  OWNER: [
    "team.manage",
    "team.invite",
    "team.remove",
    "content.create",
    "content.edit",
    "content.delete",
    "branding.manage",
    "scheduler.use",
    "analytics.view",
    "api.use",
  ],

  ADMIN: [
    "team.manage",
    "team.invite",
    "team.remove",
    "content.create",
    "content.edit",
    "content.delete",
    "branding.manage",
    "scheduler.use",
    "analytics.view",
  ],

  EDITOR: [
    "content.create",
    "content.edit",
    "scheduler.use",
  ],

  VIEWER: [
    "analytics.view",
  ],
};

class PermissionService {
  /**
   * Returns all permissions for a role.
   */
  getPermissions(
    role: TeamRole
  ): TeamPermission[] {
    return (
      ROLE_PERMISSIONS[role] ?? []
    );
  }

  /**
   * Returns whether a role contains
   * a specific permission.
   */
  hasPermission(
    role: TeamRole,
    permission: TeamPermission
  ): boolean {
    return this.getPermissions(
      role
    ).includes(permission);
  }

  /**
   * OWNER automatically has every
   * permission in the system.
   */
  isOwner(
    role: TeamRole
  ): boolean {
    return role === "OWNER";
  }

  /**
   * Returns whether the role can
   * manage team members.
   */
  canManageTeam(
    role: TeamRole
  ): boolean {
    return this.hasPermission(
      role,
      "team.manage"
    );
  }

  /**
   * Returns whether the role can
   * invite members.
   */
  canInvite(
    role: TeamRole
  ): boolean {
    return this.hasPermission(
      role,
      "team.invite"
    );
  }

  /**
   * Returns whether the role can
   * remove members.
   */
  canRemoveMembers(
    role: TeamRole
  ): boolean {
    return this.hasPermission(
      role,
      "team.remove"
    );
  }

  /**
   * Returns whether the role can
   * create content.
   */
  canCreateContent(
    role: TeamRole
  ): boolean {
    return this.hasPermission(
      role,
      "content.create"
    );
  }

  /**
   * Returns whether the role can
   * edit content.
   */
  canEditContent(
    role: TeamRole
  ): boolean {
    return this.hasPermission(
      role,
      "content.edit"
    );
  }

  /**
   * Returns whether the role can
   * delete content.
   */
  canDeleteContent(
    role: TeamRole
  ): boolean {
    return this.hasPermission(
      role,
      "content.delete"
    );
  }

  /**
   * Returns whether the role can
   * manage branding.
   */
  canManageBranding(
    role: TeamRole
  ): boolean {
    return this.hasPermission(
      role,
      "branding.manage"
    );
  }

  /**
   * Returns whether the role can
   * use the scheduler.
   */
  canUseScheduler(
    role: TeamRole
  ): boolean {
    return this.hasPermission(
      role,
      "scheduler.use"
    );
  }

  /**
   * Returns whether the role can
   * view analytics.
   */
  canViewAnalytics(
    role: TeamRole
  ): boolean {
    return this.hasPermission(
      role,
      "analytics.view"
    );
  }

  /**
   * Returns whether the role can
   * use the API.
   */
  canUseApi(
    role: TeamRole
  ): boolean {
    return this.hasPermission(
      role,
      "api.use"
    );
  }
}

export default new PermissionService();