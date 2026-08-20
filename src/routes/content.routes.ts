import { Router } from "express";

import contentController from "../controllers/content.controller";

import {
  protect,
  authorize,
} from "../middleware/auth.middleware";

import requireSubscription from "../middleware/requireSubscription.middleware";

import {
  aiGenerationLimiter,
} from "../middleware/rateLimit.middleware";

const router = Router();

/**
 * Generate AI content.
 *
 * Requires:
 * - Authentication
 * - CUSTOMER / CUSTOMER_STAFF / ADMIN role
 * - Active subscription
 * - AI generation rate limit
 *
 * The AI generation limiter protects expensive
 * AI provider requests from being spammed.
 */
router.post(
  "/generate",
  protect,
  authorize(
    "ADMIN",
    "CUSTOMER",
    "CUSTOMER_STAFF"
  ),
  requireSubscription,
  aiGenerationLimiter,
  contentController.generate
);

/**
 * Get all generated content.
 *
 * Protected by:
 * - Authentication
 * - Authorization
 *
 * The global API rate limiter in app.ts
 * also protects this endpoint.
 */
router.get(
  "/history",
  protect,
  authorize(
    "ADMIN",
    "CUSTOMER",
    "CUSTOMER_STAFF"
  ),
  contentController.getHistory
);

/**
 * Get paginated content history.
 */
router.get(
  "/history/page",
  protect,
  authorize(
    "ADMIN",
    "CUSTOMER",
    "CUSTOMER_STAFF"
  ),
  contentController.getHistoryPage
);

/**
 * Get recently generated content.
 */
router.get(
  "/recent",
  protect,
  authorize(
    "ADMIN",
    "CUSTOMER",
    "CUSTOMER_STAFF"
  ),
  contentController.recent
);

/**
 * Get a single content item.
 */
router.get(
  "/:id",
  protect,
  authorize(
    "ADMIN",
    "CUSTOMER",
    "CUSTOMER_STAFF"
  ),
  contentController.getContent
);

/**
 * Delete a content item.
 */
router.delete(
  "/:id",
  protect,
  authorize(
    "ADMIN",
    "CUSTOMER",
    "CUSTOMER_STAFF"
  ),
  contentController.deleteContent
);

export default router;