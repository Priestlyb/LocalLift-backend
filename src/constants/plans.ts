import {
  PlanEntitlement,
  PlanKey,
} from "../types/subscription.types";

/**
 * ==========================================
 * SUBSCRIPTION PLANS
 * ==========================================
 *
 * Central source of truth for:
 *
 * - Pricing
 * - Billing duration
 * - Usage limits
 * - Features
 * - Queue priority
 *
 * Prices are controlled by the backend.
 * Never trust prices received from clients.
 */

export const PLANS: Record<
  PlanKey,
  PlanEntitlement
> = {
  /**
   * ==========================================
   * FREE
   * ==========================================
   */

  FREE: {
    id: "FREE",
    name: "Free",
    price: 0,
    durationMonths: 1,

    limits: {
      imageGenerations: 3,
      maxResolution: "720p",
    },

    features: {
      watermark: true,
      branding: false,
      aiCaptions: false,
      scheduler: false,
      analytics: false,
      teamAccess: false,
      apiAccess: false,
      multipleBrands: false,
    },

    // Lowest queue priority
    priority: 0,
  },

  /**
   * ==========================================
   * STARTER
   * ==========================================
   */

  STARTER: {
    id: "STARTER",
    name: "Starter",
    price: 5000,
    durationMonths: 1,

    limits: {
      imageGenerations: 30,
      maxResolution: "1080p",
    },

    features: {
      watermark: false,
      branding: true,
      aiCaptions: true,
      scheduler: false,
      analytics: false,
      teamAccess: false,
      apiAccess: false,
      multipleBrands: false,
    },

    // Low queue priority
    priority: 1,
  },

  /**
   * ==========================================
   * GROWTH
   * ==========================================
   */

  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    price: 10000,
    durationMonths: 1,

    limits: {
      imageGenerations: 80,
      maxResolution: "1080p",
    },

    features: {
      watermark: false,
      branding: true,
      aiCaptions: true,
      scheduler: true,
      analytics: true,
      teamAccess: true,
      apiAccess: false,
      multipleBrands: false,
    },

    // High queue priority
    priority: 2,
  },

  /**
   * ==========================================
   * PRO
   * ==========================================
   */

  PRO: {
    id: "PRO",
    name: "Pro",
    price: 20000,
    durationMonths: 1,

    limits: {
      imageGenerations: 200,
      maxResolution: "1080p",
    },

    features: {
      watermark: false,
      branding: true,
      aiCaptions: true,
      scheduler: true,
      analytics: true,
      teamAccess: true,
      apiAccess: true,
      multipleBrands: true,
    },

    // Highest queue priority
    priority: 3,
  },
};

/**
 * ==========================================
 * PLAN TYPE
 * ==========================================
 */

export type Plan =
  (typeof PLANS)[PlanKey];