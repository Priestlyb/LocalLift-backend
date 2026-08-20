import { Router } from "express";

import {
    initializePayment,
    verifyPayment,
    koraWebhook,
    paystackWebhook,
    getPaymentHistory,
    paymentSuccess,
    paymentFailed,
} from "../controllers/payment.controller";

import {
    protect,
    authorize,
} from "../middleware/auth.middleware";

import {
    paymentLimiter,
} from "../middleware/rateLimit.middleware";

import {
    validateInitializePayment,
} from "../validators/payment.validator";

const router = Router();

/**
 * PAYMENT INITIALIZATION
 *
 * Protected by:
 * - Authentication
 * - Customer authorization
 * - Request validation
 * - Payment rate limiting
 *
 * Rate limiting helps prevent a user from
 * repeatedly creating payment initialization
 * requests.
 */
router.post(
    "/initialize",
    paymentLimiter,
    protect,
    authorize("CUSTOMER"),
    validateInitializePayment,
    initializePayment
);

/**
 * PAYMENT VERIFICATION
 *
 * Protected by:
 * - Authentication
 * - Customer authorization
 * - Payment rate limiting
 *
 * Prevents excessive verification requests
 * against the payment provider.
 */
router.get(
    "/verify/:reference",
    paymentLimiter,
    protect,
    authorize("CUSTOMER"),
    verifyPayment
);

/**
 * PAYSTACK CALLBACK PAGES
 *
 * These are not webhooks.
 *
 * They are redirect pages that the React Native
 * WebView listens for after Paystack finishes.
 *
 * These are intentionally NOT rate limited by
 * paymentLimiter because they are callback/redirect
 * endpoints rather than payment API operations.
 */
router.get(
    "/payment-success",
    paymentSuccess
);

router.get(
    "/payment-failed",
    paymentFailed
);

/**
 * WEBHOOKS
 *
 * DO NOT apply paymentLimiter here.
 *
 * Payment providers need to be able to deliver
 * webhook events reliably.
 *
 * Webhooks should instead be protected using:
 * - Signature verification
 * - Idempotency
 * - Duplicate event protection
 * - Payload validation
 */
router.post(
    "/webhook/kora",
    koraWebhook
);

router.post(
    "/webhook/paystack",
    paystackWebhook
);

/**
 * PAYMENT HISTORY
 *
 * This remains protected by authentication
 * and customer authorization.
 *
 * The global API limiter in app.ts also protects
 * this endpoint.
 */
router.get(
    "/history",
    protect,
    authorize("CUSTOMER"),
    getPaymentHistory
);

export default router;