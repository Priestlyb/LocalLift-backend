import { Router } from "express";

import analyticsController from "../controllers/analytics.controller";

import {
  protect,
  authorize,
} from "../middleware/auth.middleware";

import requireSubscription from "../middleware/requireSubscription.middleware";
import requireAnalytics from "../middleware/requireAnalytics.middleware";

const router = Router();

/**
 * All analytics routes require:
 * - Authentication
 * - Authorized role
 * - Active subscription
 * - Analytics feature
 */
router.use(
  protect,
  authorize(
    "ADMIN",
    "CUSTOMER",
    "CUSTOMER_STAFF"
  ),
  requireSubscription,
  requireAnalytics
);

/**
 * Dashboard summary.
 */
router.get(
  "/summary/:businessId",
  analyticsController.getSummary
);

/**
 * Returns all analytics
 * for a business.
 */
router.get(
  "/business/:businessId",
  analyticsController.getBusinessAnalytics
);

/**
 * Returns analytics
 * for a content item.
 */
router.get(
  "/content/:contentId",
  analyticsController.getContentAnalytics
);

/**
 * Weekly report.
 */
router.get(
  "/report/weekly/:businessId",
  analyticsController.getWeeklyReport
);

/**
 * Monthly report.
 */
router.get(
  "/report/monthly/:businessId",
  analyticsController.getMonthlyReport
);

/**
 * Platform breakdown.
 */
router.get(
  "/platforms/:businessId",
  analyticsController.getPlatformBreakdown
);

/**
 * Top performing content.
 */
router.get(
  "/top-content/:businessId",
  analyticsController.getTopPerformingContent
);

/**
 * Posting activity.
 */
router.get(
  "/activity/:businessId",
  analyticsController.getPostingActivity
);

/**
 * AI insights.
 */
router.get(
  "/insights/:businessId",
  analyticsController.getInsights
);

/**
 * Best performing platform.
 */
router.get(
  "/best-platform/:businessId",
  analyticsController.getBestPlatform
);

/**
 * Best performing content.
 */
router.get(
  "/best-content/:businessId",
  analyticsController.getBestContent
);

/**
 * Overall engagement score.
 */
router.get(
  "/engagement-score/:businessId",
  analyticsController.getEngagementScore
);

export default router;