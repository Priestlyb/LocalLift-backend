/**
 * ==========================================
 * SUBSCRIPTION TYPES
 * ==========================================
 *
 * Shared types for:
 *
 * - Subscription plans
 * - Plan entitlements
 * - Usage limits
 * - Features
 * - Queue priority
 * - Subscription status
 *
 * PlanKey is intentionally defined here
 * independently from PLANS to avoid circular
 * type dependencies.
 */

/**
 * ==========================================
 * AVAILABLE SUBSCRIPTION PLANS
 * ==========================================
 */

export type PlanKey =
  | "FREE"
  | "STARTER"
  | "GROWTH"
  | "PRO";

/**
 * ==========================================
 * QUEUE PRIORITY
 * ==========================================
 *
 * Higher number = higher queue priority.
 *
 * FREE    = 0
 * STARTER = 1
 * GROWTH  = 2
 * PRO     = 3
 */

export type Priority =
  | 0
  | 1
  | 2
  | 3;

/**
 * ==========================================
 * SUPPORTED DOWNLOAD RESOLUTIONS
 * ==========================================
 */

export type Resolution =
  | "720p"
  | "1080p";

/**
 * ==========================================
 * FEATURE FLAGS
 * ==========================================
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
 * ==========================================
 * PLAN LIMITS
 * ==========================================
 */

export interface PlanLimits {
  imageGenerations: number;
  maxResolution: Resolution;
}

/**
 * ==========================================
 * PLAN ENTITLEMENT
 * ==========================================
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
 * ==========================================
 * USAGE SUMMARY
 * ==========================================
 */

export interface UsageSummary {
  imageGenerations: number;
  downloads: number;
  scheduledPosts: number;
  apiRequests: number;
}

/**
 * ==========================================
 * SUBSCRIPTION STATUS
 * ==========================================
 */

export type SubscriptionStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "PENDING"
  | "PAST_DUE";

/**
 * ==========================================
 * BILLING CYCLE
 * ==========================================
 */

export type BillingCycle =
  | "MONTHLY"
  | "YEARLY";

/**
 * ==========================================
 * SUBSCRIPTION INFO
 * ==========================================
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