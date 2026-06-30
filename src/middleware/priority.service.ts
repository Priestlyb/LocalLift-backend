import { PlanKey } from "../types/subscription.types";
import entitlementService from "../services/subscription/entitlement.service";

export interface PriorityResult {
  level: "LOW" | "MEDIUM" | "HIGH" | "HIGHEST";
  value: number;
}

class PriorityService {
  /**
   * Returns the generation priority for a plan.
   */
  getPriority(
    plan: PlanKey
  ): PriorityResult {
    const level =
      entitlementService.getPriority(plan);

    return {
      level,
      value: this.getPriorityValue(level),
    };
  }

  /**
   * Converts a priority level into a numeric
   * value that queue systems can use.
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
   * Returns true if one plan has a higher
   * priority than another.
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
   * Sorts queued requests so higher-priority
   * plans are processed first.
   */
  sortByPriority<
    T extends { plan: PlanKey }
  >(jobs: T[]): T[] {
    return jobs.sort(
      (a, b) =>
        this.getPriority(b.plan).value -
        this.getPriority(a.plan).value
    );
  }
}

export default new PriorityService();