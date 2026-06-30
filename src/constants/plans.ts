export const PLANS = {
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

    priority: "LOW",
  },

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

    priority: "MEDIUM",
  },

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

    priority: "HIGH",
  },

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

    priority: "HIGHEST",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type Plan = (typeof PLANS)[PlanKey];