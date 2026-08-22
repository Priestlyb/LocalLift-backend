import { Router } from "express";

import {
    protect,
    authorize,
} from "../middleware/auth.middleware";

import {
    getSubscription,
    getSubscriptionUsage,
    cancelSubscription,
} from "../controllers/subscription.controller";

const router = Router();

/**
 * ==========================================
 * GET CURRENT SUBSCRIPTION
 * ==========================================
 *
 * GET /api/v1/subscription
 *
 * Returns:
 * - Current subscription
 * - Current plan
 * - Plan limits
 * - Current usage
 * - Subscription status
 * - Cancellation information
 */
router.get(
    "/",
    protect,
    authorize("CUSTOMER"),
    getSubscription
);

/**
 * ==========================================
 * GET SUBSCRIPTION USAGE
 * ==========================================
 *
 * GET /api/v1/subscription/usage
 *
 * Returns:
 * - Current plan
 * - Image generation limit
 * - Used image generations
 * - Remaining image generations
 * - Subscription status
 * - Expiration date
 */
router.get(
    "/usage",
    protect,
    authorize("CUSTOMER"),
    getSubscriptionUsage
);

/**
 * ==========================================
 * CANCEL SUBSCRIPTION
 * ==========================================
 *
 * POST /api/v1/subscription/cancel
 *
 * Body:
 * {
 *   "immediate": true
 * }
 *
 * immediate = false/default:
 * - Subscription remains active until expiry
 * - User can resume before expiry
 *
 * immediate = true:
 * - Subscription ends immediately
 * - Paid feature access is revoked
 * - User can subscribe again
 */
router.post(
    "/cancel",
    protect,
    authorize("CUSTOMER"),
    cancelSubscription
);

export default router;