import { PLANS } from "../constants/plans";

/**
 * Available subscription plans.
 */
export type PlanKey = keyof typeof PLANS;

/**
 * Queue priority for AI generation.
 */
export type Priority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "HIGHEST";

/**
 * Supported download resolutions.
 */
export type Resolution =
  | "720p"
  | "1080p";

/**
 * Feature flags available across subscription plans.
 */
export interface PlanFeatures {
  watermark: boolean;
  branding: boolean;
  aiCaptions: boolean;
  scheduler: boolean;
  analytics: boolean;
  teamAccess: boolean;
  apiAccess: boolean;
  multipleBrands: boolean;
}

/**
 * Usage limits for a subscription plan.
 */
export interface PlanLimits {
  imageGenerations: number;
  maxResolution: Resolution;
}

/**
 * Complete entitlement for a subscription plan.
 */
export interface PlanEntitlement {
  id: PlanKey;
  name: string;
  price: number;
  durationMonths: number;
  limits: PlanLimits;
  features: PlanFeatures;
  priority: Priority;
}

/**
 * Tracks a user's current usage during the billing period.
 */
export interface UsageSummary {
  imageGenerations: number;
  downloads: number;
  scheduledPosts: number;
  apiRequests: number;
}

/**
 * Subscription status.
 */
export type SubscriptionStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "PENDING"
  | "PAST_DUE";

/**
 * Billing cycle.
 */
export type BillingCycle =
  | "MONTHLY"
  | "YEARLY";

/**
 * Information returned when checking a user's subscription.
 */
export interface SubscriptionInfo {
  plan: PlanKey;
  status: SubscriptionStatus;
  startedAt: Date;
  expiresAt: Date;
  autoRenew: boolean;
  entitlement: PlanEntitlement;
  usage: UsageSummary;
}