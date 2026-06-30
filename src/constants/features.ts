/**
 * Central registry of all subscription features.
 * These keys are used throughout the application for
 * feature gating and entitlement checks.
 */
export const FEATURES = {
  WATERMARK: "watermark",
  BRANDING: "branding",
  AI_CAPTIONS: "aiCaptions",
  SCHEDULER: "scheduler",
  ANALYTICS: "analytics",
  TEAM_ACCESS: "teamAccess",
  API_ACCESS: "apiAccess",
  MULTIPLE_BRANDS: "multipleBrands",
} as const;

/**
 * Union type of all supported feature names.
 *
 * Example:
 * type Feature =
 *   | "watermark"
 *   | "branding"
 *   | ...
 */
export type Feature =
  (typeof FEATURES)[keyof typeof FEATURES];

/**
 * List of all available features.
 * Useful for validation, iteration and admin dashboards.
 */
export const FEATURE_LIST: Feature[] =
  Object.values(FEATURES);