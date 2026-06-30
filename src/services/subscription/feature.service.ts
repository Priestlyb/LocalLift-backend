import { Feature } from "../../constants/features";
import {
  PlanKey,
  SubscriptionStatus,
} from "../../types/subscription.types";
import entitlementService from "./entitlement.service";

class FeatureService {
  /**
   * Returns true if the subscription status
   * allows access to paid features.
   */
  isSubscriptionActive(
    status: SubscriptionStatus
  ): boolean {
    return status === "ACTIVE";
  }

  /**
   * Checks whether a plan grants access
   * to a specific feature.
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
   * Checks whether a user can use
   * a specific feature.
   */
  canUseFeature(options: {
    plan: PlanKey;
    status: SubscriptionStatus;
    feature: Feature;
  }): boolean {
    const {
      plan,
      status,
      feature,
    } = options;

    // Free plan never expires.
    if (plan !== "FREE") {
      if (!this.isSubscriptionActive(status)) {
        return false;
      }
    }

    return this.hasFeature(
      plan,
      feature
    );
  }

  /**
   * Returns whether the user can
   * generate another image.
   */
  canGenerateImage(options: {
    plan: PlanKey;
    status: SubscriptionStatus;
    usedImages: number;
  }): boolean {
    const {
      plan,
      status,
      usedImages,
    } = options;

    if (
      plan !== "FREE" &&
      !this.isSubscriptionActive(status)
    ) {
      return false;
    }

    const limit =
      entitlementService.getImageLimit(
        plan
      );

    return usedImages < limit;
  }

  /**
   * Returns remaining image generations.
   */
  getRemainingImages(options: {
    plan: PlanKey;
    usedImages: number;
  }): number {
    const {
      plan,
      usedImages,
    } = options;

    const limit =
      entitlementService.getImageLimit(
        plan
      );

    return Math.max(
      limit - usedImages,
      0
    );
  }

  /**
   * Returns maximum download resolution.
   */
  getMaxResolution(
    plan: PlanKey
  ) {
    return entitlementService.getMaxResolution(
      plan
    );
  }

  /**
   * Returns generation priority.
   */
  getPriority(
    plan: PlanKey
  ) {
    return entitlementService.getPriority(
      plan
    );
  }

  /**
   * Determines whether a subscription
   * has expired.
   */
  isExpired(
    expiresAt: Date
  ): boolean {
    return expiresAt.getTime() < Date.now();
  }

  /**
   * Determines whether the subscription
   * should be treated as active.
   */
  hasAccess(options: {
    plan: PlanKey;
    status: SubscriptionStatus;
    expiresAt?: Date;
  }): boolean {
    const {
      plan,
      status,
      expiresAt,
    } = options;

    if (plan === "FREE") {
      return true;
    }

    if (!this.isSubscriptionActive(status)) {
      return false;
    }

    if (
      expiresAt &&
      this.isExpired(expiresAt)
    ) {
      return false;
    }

    return true;
  }
}

export default new FeatureService();