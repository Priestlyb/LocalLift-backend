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

import { validateInitializePayment } from "../validators/payment.validator";

const router = Router();

/**
 * PAYMENT INITIALIZATION
 */
router.post(
    "/initialize",
    protect,
    authorize("CUSTOMER"),
    validateInitializePayment,
    initializePayment
);

/**
 * PAYMENT VERIFICATION
 */
router.get(
    "/verify/:reference",
    protect,
    authorize("CUSTOMER"),
    verifyPayment
);

/**
 * PAYSTACK CALLBACK PAGES
 *
 * These are not webhooks.
 * They are redirect pages that the React Native
 * WebView listens for after Paystack finishes.
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
 */
router.get(
    "/history",
    protect,
    authorize("CUSTOMER"),
    getPaymentHistory
);

export default router;