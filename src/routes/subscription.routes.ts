import { Router } from "express";

import {
    protect,
    authorize,
} from "../middleware/auth.middleware";

import {
    getSubscription,
    cancelSubscription,
} from "../controllers/subscription.controller";

const router = Router();

/**
 * GET CURRENT SUBSCRIPTION + USAGE
 *
 * Returns:
 * - Current subscription
 * - Current plan limits
 * - Current usage
 * - Whether the subscription can be resumed
 */
router.get(
    "/",
    protect,
    authorize("CUSTOMER"),
    getSubscription
);

/**
 * CANCEL SUBSCRIPTION
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
 * - Access to paid features is revoked
 * - User can subscribe again
 */
router.post(
    "/cancel",
    protect,
    authorize("CUSTOMER"),
    cancelSubscription
);

export default router;