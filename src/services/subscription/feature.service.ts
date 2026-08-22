import { Feature } from "../../constants/features";

import {
  PlanKey,
  SubscriptionStatus,
} from "../../types/subscription.types";

import entitlementService from "./entitlement.service";

/**
 * ==========================================
 * FEATURE SERVICE
 * ==========================================
 *
 * Responsible for determining whether a user
 * is allowed to access subscription features.
 *
 * SECURITY PRINCIPLES
 * ------------------------------------------
 *
 * 1. Never trust plan/status values from clients.
 * 2. Paid features require an ACTIVE subscription.
 * 3. Paid subscriptions must not be expired.
 * 4. FREE is treated separately because it does
 *    not have a billing expiration.
 * 5. Usage limits fail closed for invalid values.
 * 6. Feature access is resolved server-side.
 * 7. Never use frontend-provided entitlement data.
 */

class FeatureService {
  /**
   * ==========================================
   * SUBSCRIPTION STATUS
   * ==========================================
   */

  /**
   * Returns true only when the subscription
   * status explicitly allows paid features.
   *
   * We intentionally do not treat:
   *
   * - EXPIRED
   * - CANCELLED
   * - PAST_DUE
   *
   * as active.
   */
  isSubscriptionActive(
    status: SubscriptionStatus
  ): boolean {
    return status === "ACTIVE";
  }

  /**
   * ==========================================
   * FEATURE ACCESS
   * ==========================================
   */

  /**
   * Checks whether a plan grants access
   * to a specific feature.
   *
   * The entitlement service is the single
   * source of truth.
   */
  hasFeature(
    plan: PlanKey,
    feature: Feature
  ): boolean {
    return entitlementService.hasFeature(
      plan,
      feature
    );
  }

  /**
   * ==========================================
   * CAN USE FEATURE
   * ==========================================
   *
   * Determines whether a user can access
   * a specific feature right now.
   */
  canUseFeature(options: {
    plan: PlanKey;
    status: SubscriptionStatus;
    feature: Feature;
    expiresAt?: Date | null;
  }): boolean {
    const {
      plan,
      status,
      feature,
      expiresAt,
    } = options;

    /**
     * --------------------------------------
     * FREE PLAN
     * --------------------------------------
     *
     * FREE does not require an active
     * paid subscription.
     *
     * We still resolve the actual feature
     * entitlement from the server.
     */
    if (
      plan === "FREE"
    ) {
      return this.hasFeature(
        plan,
        feature
      );
    }

    /**
     * --------------------------------------
     * PAID PLAN STATUS
     * --------------------------------------
     */

    if (
      !this.isSubscriptionActive(
        status
      )
    ) {
      return false;
    }

    /**
     * --------------------------------------
     * EXPIRATION
     * --------------------------------------
     *
     * Even if the database status says
     * ACTIVE, an expired subscription must
     * not receive paid feature access.
     */
    if (
      expiresAt &&
      this.isExpired(
        expiresAt
      )
    ) {
      return false;
    }

    /**
     * --------------------------------------
     * ENTITLEMENT
     * --------------------------------------
     */

    return this.hasFeature(
      plan,
      feature
    );
  }

  /**
   * ==========================================
   * IMAGE GENERATION
   * ==========================================
   */

  /**
   * Returns whether the user can generate
   * another image.
   *
   * Usage must be validated server-side.
   */
  canGenerateImage(options: {
    plan: PlanKey;
    status: SubscriptionStatus;
    usedImages: number;
    expiresAt?: Date | null;
  }): boolean {
    const {
      plan,
      status,
      usedImages,
      expiresAt,
    } = options;

    /**
     * --------------------------------------
     * VALIDATE USAGE
     * --------------------------------------
     *
     * Invalid usage values fail closed.
     *
     * Negative usage values are especially
     * important to reject because otherwise
     * they could artificially increase the
     * available quota.
     */
    if (
      !this.isValidUsageCount(
        usedImages
      )
    ) {
      return false;
    }

    /**
     * --------------------------------------
     * FREE PLAN
     * --------------------------------------
     */

    if (
      plan === "FREE"
    ) {
      const limit =
        entitlementService.getImageLimit(
          plan
        );

      return (
        usedImages <
        limit
      );
    }

    /**
     * --------------------------------------
     * PAID PLAN ACCESS
     * --------------------------------------
     */

    if (
      !this.isSubscriptionActive(
        status
      )
    ) {
      return false;
    }

    /**
     * Never allow an expired paid
     * subscription to consume quota.
     */
    if (
      expiresAt &&
      this.isExpired(
        expiresAt
      )
    ) {
      return false;
    }

    /**
     * --------------------------------------
     * CHECK LIMIT
     * --------------------------------------
     */

    const limit =
      entitlementService.getImageLimit(
        plan
      );

    return (
      usedImages <
      limit
    );
  }

  /**
   * ==========================================
   * REMAINING IMAGE GENERATIONS
   * ==========================================
   *
   * Returns the number of image generations
   * remaining for a plan.
   *
   * This method intentionally does not decide
   * whether the subscription is currently
   * active. Use canGenerateImage() or
   * hasAccess() for access decisions.
   */
  getRemainingImages(options: {
    plan: PlanKey;
    usedImages: number;
  }): number {
    const {
      plan,
      usedImages,
    } = options;

    /**
     * Invalid usage values fail closed.
     */
    if (
      !this.isValidUsageCount(
        usedImages
      )
    ) {
      return 0;
    }

    const limit =
      entitlementService.getImageLimit(
        plan
      );

    /**
     * Defensive validation of the
     * entitlement configuration.
     */
    if (
      !Number.isSafeInteger(
        limit
      ) ||
      limit < 0
    ) {
      return 0;
    }

    return Math.max(
      limit - usedImages,
      0
    );
  }

  /**
   * ==========================================
   * MAX DOWNLOAD RESOLUTION
   * ==========================================
   */

  getMaxResolution(
    plan: PlanKey
  ) {
    return entitlementService.getMaxResolution(
      plan
    );
  }

  /**
   * ==========================================
   * QUEUE PRIORITY
   * ==========================================
   */

  getPriority(
    plan: PlanKey
  ) {
    return entitlementService.getPriority(
      plan
    );
  }

  /**
   * ==========================================
   * EXPIRATION
   * ==========================================
   */

  /**
   * Determines whether a subscription
   * expiration date has passed.
   *
   * A subscription expiring exactly at
   * the current timestamp is considered
   * expired.
   */
  isExpired(
    expiresAt: Date
  ): boolean {
    /**
     * Invalid dates fail closed.
     */
    if (
      !(expiresAt instanceof Date) ||
      Number.isNaN(
        expiresAt.getTime()
      )
    ) {
      return true;
    }

    return (
      expiresAt.getTime() <=
      Date.now()
    );
  }

  /**
   * ==========================================
   * ACCESS CONTROL
   * ==========================================
   *
   * Determines whether the subscription
   * should currently be treated as active.
   */
  hasAccess(options: {
    plan: PlanKey;
    status: SubscriptionStatus;
    expiresAt?: Date | null;
  }): boolean {
    const {
      plan,
      status,
      expiresAt,
    } = options;

    /**
     * --------------------------------------
     * FREE PLAN
     * --------------------------------------
     *
     * FREE does not expire.
     */
    if (
      plan === "FREE"
    ) {
      return true;
    }

    /**
     * --------------------------------------
     * PAID PLAN STATUS
     * --------------------------------------
     */

    if (
      !this.isSubscriptionActive(
        status
      )
    ) {
      return false;
    }

    /**
     * --------------------------------------
     * PAID PLAN EXPIRATION
     * --------------------------------------
     *
     * Missing expiresAt for a paid plan
     * is treated as invalid rather than
     * granting indefinite access.
     */
    if (
      !expiresAt
    ) {
      return false;
    }

    if (
      this.isExpired(
        expiresAt
      )
    ) {
      return false;
    }

    return true;
  }

  /**
   * ==========================================
   * VALIDATE USAGE COUNT
   * ==========================================
   *
   * Usage counters should always be:
   *
   * - numbers
   * - finite
   * - integers
   * - non-negative
   * - safe integers
   */
  private isValidUsageCount(
    value: unknown
  ): value is number {
    return (
      typeof value ===
      "number" &&
      Number.isFinite(
        value
      ) &&
      Number.isSafeInteger(
        value
      ) &&
      value >= 0
    );
  }
}

/**
 * ==========================================
 * SINGLETON INSTANCE
 * ==========================================
 */

export default new FeatureService();