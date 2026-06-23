import { Router } from "express";

import {
    initializePayment,
    verifyPayment,
    koraWebhook,
    paystackWebhook,
} from "../controllers/payment.controller";

import { protect } from "../middleware/auth.middleware";
import { validateInitializePayment } from "../validators/payment.validator";

const router = Router();

/**
 * User Payment Routes
 */

// Initialize payment
router.post(
    "/initialize",
    protect,
    validateInitializePayment,
    initializePayment
);

// Verify payment
router.get(
    "/verify/:reference",
    protect,
    verifyPayment
);

/**
 * Webhook Routes
 *
 * Do NOT protect these routes.
 * They must be accessible by Kora and Paystack.
 */

// Kora webhook
router.post(
    "/webhook/kora",
    koraWebhook
);

// Paystack webhook
router.post(
    "/webhook/paystack",
    paystackWebhook
);

export default router;