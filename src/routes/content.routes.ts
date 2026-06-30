import { Router } from "express";

import contentController from "../controllers/content.controller";

import {
  protect,
  authorize,
} from "../middleware/auth.middleware";

import requireSubscription from "../middleware/requireSubscription.middleware";

const router = Router();

/**
 * Generate AI content.
 * Requires an active subscription.
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
  contentController.generate
);

/**
 * Get all generated content.
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