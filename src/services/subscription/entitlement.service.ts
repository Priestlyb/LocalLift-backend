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
 * This is the single source of truth for subscription
 * features, pricing and plan hierarchy.
 */
class EntitlementService {
  /**
   * Plan hierarchy.
   */
  private readonly planOrder: PlanKey[] = [
    "FREE",
    "STARTER",
    "GROWTH",
    "PRO",
  ];

  /**
   * Returns the entitlement for a plan.
   *
   * @throws Error if the plan does not exist.
   */
  getPlan(plan: PlanKey): PlanEntitlement {
    const entitlement = PLANS[plan];

    if (!entitlement) {
      throw new Error(
        `Unknown subscription plan: ${plan}`
      );
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
   * Returns the numeric rank of a plan.
   */
  getPlanRank(
    plan: PlanKey
  ): number {
    return this.planOrder.indexOf(plan);
  }

  /**
   * Returns the plan hierarchy.
   */
  getPlanOrder(): PlanKey[] {
    return [...this.planOrder];
  }

  /**
   * Returns the next higher plan.
   */
  getNextPlan(
    plan: PlanKey
  ): PlanKey | null {
    const index =
      this.getPlanRank(plan);

    if (
      index === -1 ||
      index ===
      this.planOrder.length - 1
    ) {
      return null;
    }

    return this.planOrder[index + 1];
  }

  /**
   * Returns the next lower plan.
   */
  getPreviousPlan(
    plan: PlanKey
  ): PlanKey | null {
    const index =
      this.getPlanRank(plan);

    if (index <= 0) {
      return null;
    }

    return this.planOrder[index - 1];
  }

  /**
   * Determines whether a plan can be upgraded.
   */
  canUpgrade(
    current: PlanKey,
    target: PlanKey
  ): boolean {
    return (
      this.getPlanRank(target) >
      this.getPlanRank(current)
    );
  }

  /**
   * Determines whether a plan can be downgraded.
   */
  canDowngrade(
    current: PlanKey,
    target: PlanKey
  ): boolean {
    return (
      this.getPlanRank(target) <
      this.getPlanRank(current)
    );
  }

  /**
   * Returns whether two plans are equal.
   */
  isSamePlan(
    current: PlanKey,
    target: PlanKey
  ): boolean {
    return current === target;
  }

  /**
   * Checks whether a plan exists.
   */
  isValidPlan(
    plan: string
  ): plan is PlanKey {
    return Object.prototype.hasOwnProperty.call(
      PLANS,
      plan
    );
  }
}

export default new EntitlementService();