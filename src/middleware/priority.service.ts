import {
  PlanKey,
  Priority,
} from "../types/subscription.types";

import entitlementService from "../services/subscription/entitlement.service";

/**
 * ==========================================
 * PRIORITY RESULT
 * ==========================================
 *
 * Represents the resolved queue priority
 * for a subscription plan.
 *
 * `level` is the human-readable priority.
 * `value` is the numeric value used by queue
 * systems.
 */

export interface PriorityResult {
  level:
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "HIGHEST";

  value: number;
}

/**
 * ==========================================
 * PRIORITY SERVICE
 * ==========================================
 */

class PriorityService {
  /**
   * ------------------------------------------
   * GET PRIORITY
   * ------------------------------------------
   *
   * Gets the numeric priority configured for
   * a plan and converts it into a readable
   * queue priority level.
   *
   * Mapping:
   *
   * FREE    → LOW
   * STARTER → MEDIUM
   * GROWTH  → HIGH
   * PRO     → HIGHEST
   */
  getPriority(
    plan: PlanKey
  ): PriorityResult {
    const priority =
      entitlementService.getPriority(
        plan
      );

    const level =
      this.getPriorityLevel(
        priority
      );

    return {
      level,
      value:
        this.getPriorityValue(
          level
        ),
    };
  }

  /**
   * ------------------------------------------
   * GET PRIORITY LEVEL
   * ------------------------------------------
   *
   * Converts the numeric plan priority into
   * a readable priority level.
   */
  getPriorityLevel(
    priority: Priority
  ): PriorityResult["level"] {
    switch (priority) {
      case 3:
        return "HIGHEST";

      case 2:
        return "HIGH";

      case 1:
        return "MEDIUM";

      case 0:
      default:
        return "LOW";
    }
  }

  /**
   * ------------------------------------------
   * GET PRIORITY VALUE
   * ------------------------------------------
   *
   * Converts a readable priority level into
   * the numeric value used by queue systems.
   *
   * Higher numbers indicate higher priority.
   */
  getPriorityValue(
    priority: PriorityResult["level"]
  ): number {
    switch (priority) {
      case "HIGHEST":
        return 100;

      case "HIGH":
        return 75;

      case "MEDIUM":
        return 50;

      case "LOW":
      default:
        return 25;
    }
  }

  /**
   * ------------------------------------------
   * IS HIGHER PRIORITY
   * ------------------------------------------
   *
   * Returns true when the first plan has a
   * higher queue priority than the second plan.
   */
  isHigherPriority(
    first: PlanKey,
    second: PlanKey
  ): boolean {
    return (
      this.getPriority(first).value >
      this.getPriority(second).value
    );
  }

  /**
   * ------------------------------------------
   * SORT BY PRIORITY
   * ------------------------------------------
   *
   * Sorts queued requests so higher-priority
   * plans are processed first.
   *
   * The original array is sorted in place,
   * matching the behavior of Array.sort().
   */
  sortByPriority<
    T extends {
      plan: PlanKey;
    }
  >(
    jobs: T[]
  ): T[] {
    return jobs.sort(
      (a, b) =>
        this.getPriority(b.plan)
          .value -
        this.getPriority(a.plan)
          .value
    );
  }
}

/**
 * ==========================================
 * SINGLETON INSTANCE
 * ==========================================
 */

export default new PriorityService();