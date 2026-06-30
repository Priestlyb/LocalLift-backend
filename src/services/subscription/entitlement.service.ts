import { PLANS } from "../../constants/plans";
import {
  Feature,
} from "../../constants/features";
import {
  PlanEntitlement,
  PlanKey,
} from "../../types/subscription.types";

/**
 * Service responsible for resolving plan entitlements.
 * This is the single source of truth for subscription features.
 */
class EntitlementService {
  /**
   * Returns the entitlement for a plan.
   *
   * @throws Error if the plan does not exist.
   */
  getPlan(plan: PlanKey): PlanEntitlement {
    const entitlement = PLANS[plan];

    if (!entitlement) {
      throw new Error(`Unknown subscription plan: ${plan}`);
    }

    return entitlement;
  }

  /**
   * Returns every available subscription plan.
   */
  getPlans(): PlanEntitlement[] {
    return Object.values(
      PLANS
    ) as PlanEntitlement[];
  }

  /**
   * Returns whether a plan includes a feature.
   */
  hasFeature(
    plan: PlanKey,
    feature: Feature
  ): boolean {
    return this.getPlan(plan).features[
      feature
    ];
  }

  /**
   * Returns the image generation limit.
   */
  getImageLimit(
    plan: PlanKey
  ): number {
    return this.getPlan(plan).limits
      .imageGenerations;
  }

  /**
   * Returns the maximum download resolution.
   */
  getMaxResolution(
    plan: PlanKey
  ) {
    return this.getPlan(plan).limits
      .maxResolution;
  }

  /**
   * Returns the queue priority.
   */
  getPriority(
    plan: PlanKey
  ) {
    return this.getPlan(plan).priority;
  }

  /**
   * Returns the monthly subscription price.
   */
  getPrice(
    plan: PlanKey
  ): number {
    return this.getPlan(plan).price;
  }

  /**
   * Returns the billing duration.
   */
  getDurationMonths(
    plan: PlanKey
  ): number {
    return this.getPlan(plan)
      .durationMonths;
  }

  /**
   * Determines whether a plan can be upgraded.
   */
  canUpgrade(
    current: PlanKey,
    target: PlanKey
  ): boolean {
    const order: PlanKey[] = [
      "FREE",
      "STARTER",
      "GROWTH",
      "PRO",
    ];

    return (
      order.indexOf(target) >
      order.indexOf(current)
    );
  }

  /**
   * Determines whether a plan can be downgraded.
   */
  canDowngrade(
    current: PlanKey,
    target: PlanKey
  ): boolean {
    const order: PlanKey[] = [
      "FREE",
      "STARTER",
      "GROWTH",
      "PRO",
    ];

    return (
      order.indexOf(target) <
      order.indexOf(current)
    );
  }

  /**
   * Checks whether a plan exists.
   */
  isValidPlan(
    plan: string
  ): plan is PlanKey {
    return plan in PLANS;
  }
}

export default new EntitlementService();