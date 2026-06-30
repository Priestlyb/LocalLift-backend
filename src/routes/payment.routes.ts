import { Router } from "express";

import {
    initializePayment,
    verifyPayment,
    koraWebhook,
    paystackWebhook,
    getPaymentHistory,
} from "../controllers/payment.controller";

import {
    protect,
    authorize
} from "../middleware/auth.middleware";
import { validateInitializePayment } from "../validators/payment.validator";

const router = Router();

router.post(
    "/initialize",
    protect,
    authorize("CUSTOMER"),
    validateInitializePayment,
    initializePayment
);

router.get(
    "/verify/:reference",
    protect,
    authorize("CUSTOMER"),
    verifyPayment
);

router.post(
    "/webhook/kora",
    koraWebhook
);

router.post(
    "/webhook/paystack",
    paystackWebhook
);

router.get(
    "/history",
    protect,
    authorize("CUSTOMER"),
    getPaymentHistory
);

export default router;