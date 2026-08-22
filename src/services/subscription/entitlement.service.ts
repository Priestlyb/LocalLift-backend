import { PLANS } from "../../constants/plans";

import {
  Feature,
} from "../../constants/features";

import {
  PlanEntitlement,
  PlanKey,
} from "../../types/subscription.types";

/**
 * ==========================================
 * ENTITLEMENT SERVICE
 * ==========================================
 *
 * Central source of truth for:
 *
 * - Subscription plans
 * - Plan hierarchy
 * - Pricing
 * - Features
 * - Usage limits
 * - Billing duration
 * - Queue priority
 *
 * SECURITY PRINCIPLES
 * ------------------------------------------
 *
 * 1. Never trust plan values from clients.
 * 2. Validate arbitrary strings at runtime.
 * 3. Never calculate payment amounts from
 *    frontend-provided values.
 * 4. Keep the plan hierarchy immutable.
 * 5. Fail closed when configuration is invalid.
 * 6. Never silently fall back to another plan.
 */

/**
 * ==========================================
 * PLAN ORDER
 * ==========================================
 *
 * `as const` prevents accidental mutation.
 */
const PLAN_ORDER = [
  "FREE",
  "STARTER",
  "GROWTH",
  "PRO",
] as const;

/**
 * ==========================================
 * TYPE HELPERS
 * ==========================================
 */

/**
 * Runtime-safe representation of a plan.
 */
const isPlanKey = (
  value: unknown
): value is PlanKey => {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  return (
    PLAN_ORDER as readonly string[]
  ).includes(value);
};

/**
 * ==========================================
 * ENTITLEMENT SERVICE
 * ==========================================
 */

class EntitlementService {
  /**
   * Immutable plan hierarchy.
   *
   * We expose copies through getPlanOrder()
   * so callers cannot mutate our internal
   * configuration.
   */
  private readonly planOrder: readonly PlanKey[] =
    PLAN_ORDER;

  /**
   * ------------------------------------------
   * GET PLAN
   * ------------------------------------------
   *
   * Returns the complete entitlement
   * configuration for a plan.
   *
   * This method deliberately throws when
   * the plan is invalid.
   *
   * Silent fallbacks are dangerous because
   * they could accidentally grant the wrong
   * subscription entitlements.
   */
  getPlan(
    plan: PlanKey
  ): PlanEntitlement {
    if (
      !this.isValidPlan(plan)
    ) {
      throw new Error(
        `Unknown subscription plan: ${String(
          plan
        )}`
      );
    }

    const entitlement =
      PLANS[plan];

    if (
      !entitlement ||
      typeof entitlement !==
      "object"
    ) {
      throw new Error(
        `Subscription plan configuration is invalid: ${plan}`
      );
    }

    return entitlement;
  }

  /**
   * ------------------------------------------
   * GET ALL PLANS
   * ------------------------------------------
   *
   * Returns plans in the explicitly defined
   * hierarchy order rather than relying on
   * JavaScript object property ordering.
   */
  getPlans(): PlanEntitlement[] {
    return this.planOrder.map(
      (plan) =>
        this.getPlan(plan)
    );
  }

  /**
   * ------------------------------------------
   * HAS FEATURE
   * ------------------------------------------
   *
   * Returns whether the specified plan
   * includes a feature.
   */
  hasFeature(
    plan: PlanKey,
    feature: Feature
  ): boolean {
    const entitlement =
      this.getPlan(plan);

    return (
      entitlement.features?.[
      feature
      ] === true
    );
  }

  /**
   * ------------------------------------------
   * GET IMAGE LIMIT
   * ------------------------------------------
   */
  getImageLimit(
    plan: PlanKey
  ): number {
    const limit =
      this.getPlan(plan)
        .limits
        ?.imageGenerations;

    if (
      !Number.isSafeInteger(
        limit
      ) ||
      limit < 0
    ) {
      throw new Error(
        `Invalid image generation limit configured for plan: ${plan}`
      );
    }

    return limit;
  }

  /**
   * ------------------------------------------
   * GET MAX RESOLUTION
   * ------------------------------------------
   */
  getMaxResolution(
    plan: PlanKey
  ) {
    const resolution =
      this.getPlan(plan)
        .limits
        ?.maxResolution;

    if (
      resolution ===
      undefined ||
      resolution === null
    ) {
      throw new Error(
        `Invalid maximum resolution configured for plan: ${plan}`
      );
    }

    return resolution;
  }

  /**
   * ------------------------------------------
   * GET PRIORITY
   * ------------------------------------------
   */
  getPriority(
    plan: PlanKey
  ) {
    const priority =
      this.getPlan(plan)
        .priority;

    if (
      typeof priority !==
      "number" ||
      !Number.isFinite(
        priority
      )
    ) {
      throw new Error(
        `Invalid queue priority configured for plan: ${plan}`
      );
    }

    return priority;
  }

  /**
   * ------------------------------------------
   * GET PRICE
   * ------------------------------------------
   *
   * IMPORTANT:
   *
   * This is the server-side source of truth
   * for payment amounts.
   *
   * Never replace this with an amount received
   * from req.body.
   */
  getPrice(
    plan: PlanKey
  ): number {
    const price =
      this.getPlan(plan)
        .price;

    if (
      !Number.isSafeInteger(
        price
      ) ||
      price < 0
    ) {
      throw new Error(
        `Invalid price configured for plan: ${plan}`
      );
    }

    return price;
  }

  /**
   * ------------------------------------------
   * GET BILLING DURATION
   * ------------------------------------------
   */
  getDurationMonths(
    plan: PlanKey
  ): number {
    const duration =
      this.getPlan(plan)
        .durationMonths;

    if (
      !Number.isSafeInteger(
        duration
      ) ||
      duration <= 0
    ) {
      throw new Error(
        `Invalid billing duration configured for plan: ${plan}`
      );
    }

    return duration;
  }

  /**
   * ------------------------------------------
   * GET PLAN RANK
   * ------------------------------------------
   *
   * Higher number = higher subscription tier.
   *
   * FREE    = 0
   * STARTER = 1
   * GROWTH  = 2
   * PRO     = 3
   */
  getPlanRank(
    plan: PlanKey
  ): number {
    const rank =
      this.planOrder.indexOf(
        plan
      );

    if (
      rank === -1
    ) {
      throw new Error(
        `Unknown subscription plan: ${String(
          plan
        )}`
      );
    }

    return rank;
  }

  /**
   * ------------------------------------------
   * GET PLAN ORDER
   * ------------------------------------------
   *
   * Return a copy so callers cannot mutate
   * the service's internal hierarchy.
   */
  getPlanOrder(): PlanKey[] {
    return [
      ...this.planOrder,
    ];
  }

  /**
   * ------------------------------------------
   * GET NEXT PLAN
   * ------------------------------------------
   */
  getNextPlan(
    plan: PlanKey
  ): PlanKey | null {
    const index =
      this.getPlanRank(
        plan
      );

    const nextIndex =
      index + 1;

    if (
      nextIndex >=
      this.planOrder.length
    ) {
      return null;
    }

    return this.planOrder[
      nextIndex
    ];
  }

  /**
   * ------------------------------------------
   * GET PREVIOUS PLAN
   * ------------------------------------------
   */
  getPreviousPlan(
    plan: PlanKey
  ): PlanKey | null {
    const index =
      this.getPlanRank(
        plan
      );

    const previousIndex =
      index - 1;

    if (
      previousIndex < 0
    ) {
      return null;
    }

    return this.planOrder[
      previousIndex
    ];
  }

  /**
   * ------------------------------------------
   * CAN UPGRADE
   * ------------------------------------------
   *
   * Returns true only when target is strictly
   * higher than current.
   */
  canUpgrade(
    current: PlanKey,
    target: PlanKey
  ): boolean {
    return (
      this.getPlanRank(
        target
      ) >
      this.getPlanRank(
        current
      )
    );
  }

  /**
   * ------------------------------------------
   * CAN DOWNGRADE
   * ------------------------------------------
   *
   * Returns true only when target is strictly
   * lower than current.
   */
  canDowngrade(
    current: PlanKey,
    target: PlanKey
  ): boolean {
    return (
      this.getPlanRank(
        target
      ) <
      this.getPlanRank(
        current
      )
    );
  }

  /**
   * ------------------------------------------
   * SAME PLAN
   * ------------------------------------------
   */
  isSamePlan(
    current: PlanKey,
    target: PlanKey
  ): boolean {
    return (
      current === target
    );
  }

  /**
   * ------------------------------------------
   * VALIDATE PLAN
   * ------------------------------------------
   *
   * This is the runtime security boundary.
   *
   * Example:
   *
   * const requestedPlan = req.body.plan;
   *
   * if (
   *     !entitlementService.isValidPlan(
   *         requestedPlan
   *     )
   * ) {
   *     return res.status(400)...
   * }
   *
   * After this check TypeScript knows that
   * requestedPlan is a PlanKey.
   */
  isValidPlan(
    plan: unknown
  ): plan is PlanKey {
    return isPlanKey(
      plan
    );
  }

  /**
   * ------------------------------------------
   * VALIDATE PAID PLAN
   * ------------------------------------------
   *
   * Useful for payment endpoints.
   *
   * FREE should never be sent to Kora/Paystack
   * as a paid subscription purchase.
   */
  isPaidPlan(
    plan: unknown
  ): plan is Exclude<
    PlanKey,
    "FREE"
  > {
    return (
      this.isValidPlan(
        plan
      ) &&
      plan !== "FREE"
    );
  }

  /**
   * ------------------------------------------
   * VALIDATE PLAN CONFIGURATION
   * ------------------------------------------
   *
   * Performs a runtime sanity check over the
   * complete subscription configuration.
   *
   * This can be called during application
   * startup so configuration errors are caught
   * before users can make payments.
   */
  validateConfiguration(): void {
    for (
      const plan of this.planOrder
    ) {
      const entitlement =
        PLANS[plan];

      if (
        !entitlement
      ) {
        throw new Error(
          `Missing subscription configuration for plan: ${plan}`
        );
      }

      const price =
        entitlement.price;

      if (
        !Number.isSafeInteger(
          price
        ) ||
        price < 0
      ) {
        throw new Error(
          `Invalid price configured for plan: ${plan}`
        );
      }

      const duration =
        entitlement.durationMonths;

      if (
        !Number.isSafeInteger(
          duration
        ) ||
        duration <= 0
      ) {
        throw new Error(
          `Invalid duration configured for plan: ${plan}`
        );
      }

      const imageLimit =
        entitlement.limits
          ?.imageGenerations;

      if (
        !Number.isSafeInteger(
          imageLimit
        ) ||
        imageLimit < 0
      ) {
        throw new Error(
          `Invalid image generation limit configured for plan: ${plan}`
        );
      }

      const priority =
        entitlement.priority;

      if (
        typeof priority !==
        "number" ||
        !Number.isFinite(
          priority
        )
      ) {
        throw new Error(
          `Invalid priority configured for plan: ${plan}`
        );
      }
    }
  }
}

/**
 * ==========================================
 * STARTUP CONFIGURATION VALIDATION
 * ==========================================
 *
 * Fail fast if the server contains an invalid
 * subscription configuration.
 *
 * This is especially important because prices
 * are used by the payment system.
 */
const entitlementService =
  new EntitlementService();

entitlementService.validateConfiguration();

export default entitlementService;