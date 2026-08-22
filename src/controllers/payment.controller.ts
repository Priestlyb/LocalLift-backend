import crypto from "crypto";
import { Request, Response } from "express";

import User from "../models/User";
import Payment from "../models/Payment";

import { AuthRequest } from "../middleware/auth.middleware";
import { PLANS } from "../constants/plans";

import { PaymentService } from "../services/payment/payment.service";

import {
    PaymentProvider as PaymentProviderName,
    PaymentPlan,
    VerifiedWebhookPayload,
} from "../types/payment.types";

import {
    PaymentProvider as PaymentProviderService,
} from "../services/payment/payment.interface";

import WebhookEvent from "../models/WebhookEvent";
import { addPaymentJob } from "../queues/payment.queue";

import entitlementService from "../services/subscription/entitlement.service";

import Subscription from "../models/Subscription";

import { applySubscriptionUpgrade } from "../services/subscription/applySubscriptionUpgrade";
import { schedulePlanChange } from "../services/subscription/schedulePlanChange";

/**
 * ==========================================
 * CONSTANTS
 * ==========================================
 */

const PAYMENT_REFERENCE_REGEX =
    /^[A-Za-z0-9._:-]+$/;

const MAX_PAYMENT_REFERENCE_LENGTH = 128;

/**
 * ==========================================
 * HELPERS
 * ==========================================
 */

/**
 * Safely extract a single header value.
 */
const getHeaderValue = (
    value:
        | string
        | string[]
        | undefined
): string | undefined => {
    if (typeof value === "string") {
        return value;
    }

    if (Array.isArray(value)) {
        return value[0];
    }

    return undefined;
};

/**
 * Webhooks must be verified against the
 * exact raw request body received from the
 * payment provider.
 *
 * IMPORTANT:
 *
 * Your webhook routes must use express.raw()
 * before this controller.
 */
const getRawWebhookBody = (
    req: Request
): Buffer => {
    if (Buffer.isBuffer(req.body)) {
        return req.body;
    }

    throw new Error(
        "Webhook request body must be a raw Buffer."
    );
};

/**
 * Parse raw webhook JSON safely.
 */
const parseWebhookBody = (
    rawBody: Buffer
): unknown => {
    try {
        return JSON.parse(
            rawBody.toString("utf8")
        );
    } catch {
        throw new Error(
            "Invalid webhook JSON payload."
        );
    }
};

/**
 * Convert a normalized and verified webhook
 * into a plain object compatible with:
 *
 * Record<string, unknown>
 *
 * This prevents storing class/object references
 * directly in Mongoose.
 */
const serializeWebhookPayload = (
    payload: VerifiedWebhookPayload
): Record<string, unknown> => {
    return {
        event: payload.event,

        reference:
            payload.reference,

        amount:
            payload.amount,

        status:
            payload.status,

        ...(payload.metadata
            ? {
                metadata:
                    payload.metadata,
            }
            : {}),
    };
};

/**
 * Safely convert a provider paidAt value
 * into a valid Date.
 */
const getSafePaidAt = (
    value?: Date | string | null
): Date => {
    if (!value) {
        return new Date();
    }

    const date =
        value instanceof Date
            ? value
            : new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return new Date();
    }

    return date;
};

/**
 * Compare payment amounts.
 *
 * Payment amounts are stored in NGN in the
 * application.
 *
 * Paystack converts kobo -> NGN inside
 * PaystackService.
 */
const amountsMatch = (
    expected: number,
    received: number
): boolean => {
    if (
        !Number.isFinite(expected) ||
        !Number.isFinite(received)
    ) {
        return false;
    }

    return expected === received;
};

/**
 * Validate payment reference.
 */
const isValidPaymentReference = (
    reference: string
): boolean => {
    return (
        reference.length > 0 &&
        reference.length <=
        MAX_PAYMENT_REFERENCE_LENGTH &&
        PAYMENT_REFERENCE_REGEX.test(
            reference
        )
    );
};

/**
 * Safely resolve a provider service.
 *
 * PaymentProviderName is the database/provider
 * name:
 *
 * "KORA" | "PAYSTACK"
 *
 * PaymentProviderService is the actual service
 * interface containing:
 *
 * initializePayment()
 * verifyPayment()
 * parseWebhook()
 * verifyWebhookSignature()
 */
const getPaymentProviderService = (
    providerName: PaymentProviderName
): PaymentProviderService => {
    const provider =
        PaymentService.getProvider(
            providerName
        ) as unknown as PaymentProviderService;

    if (
        !provider ||
        typeof provider.initializePayment !==
        "function" ||
        typeof provider.verifyPayment !==
        "function" ||
        typeof provider.parseWebhook !==
        "function" ||
        typeof provider.verifyWebhookSignature !==
        "function"
    ) {
        throw new Error(
            `Invalid payment provider service for ${providerName}.`
        );
    }

    return provider;
};

/**
 * ==========================================
 * INITIALIZE PAYMENT
 * ==========================================
 *
 * Handles:
 *
 * ACTIVE subscription
 *  - Upgrade -> payment required
 *  - Same plan -> rejected
 *  - Downgrade -> scheduled
 *
 * EXPIRED / CANCELLED subscription
 *  - Same plan -> allowed
 *  - Different plan -> allowed
 *
 * FREE subscription
 *  - Paid plan -> payment required
 */
export const initializePayment = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        /**
         * ---------------------------------------
         * AUTHENTICATION
         * ---------------------------------------
         */

        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message:
                    "Unauthorized",
            });
        }

        /**
         * ---------------------------------------
         * INPUT VALIDATION
         * ---------------------------------------
         *
         * Never trust:
         *
         * - amount
         * - user ID
         * - payment reference
         *
         * from the client.
         */

        const requestedProvider =
            req.body?.provider;

        const requestedPlan =
            req.body?.plan;

        if (
            typeof requestedProvider !==
            "string" ||
            typeof requestedPlan !==
            "string"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Provider and plan are required.",
            });
        }

        if (
            !PaymentService.isSupportedProvider(
                requestedProvider
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Unsupported payment provider.",
            });
        }

        /**
         * Only paid plans can reach this
         * endpoint.
         */
        if (
            requestedPlan !==
            "STARTER" &&
            requestedPlan !==
            "GROWTH" &&
            requestedPlan !== "PRO"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid payment plan.",
            });
        }

        const providerName =
            requestedProvider as PaymentProviderName;

        const paymentPlan =
            requestedPlan as PaymentPlan;

        /**
         * ---------------------------------------
         * USER
         * ---------------------------------------
         */

        const user =
            await User.findById(
                req.userId
            ).select("_id email");

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "User not found.",
            });
        }

        if (
            typeof user.email !==
            "string" ||
            !user.email.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "A valid email address is required for payment.",
            });
        }

        const email =
            user.email.trim();

        /**
         * ---------------------------------------
         * SERVER-SIDE PLAN CONFIGURATION
         * ---------------------------------------
         *
         * NEVER trust amount from req.body.
         */

        const planConfig =
            PLANS[paymentPlan];

        if (!planConfig) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid payment plan.",
            });
        }

        const amount =
            Number(planConfig.price);

        if (
            !Number.isFinite(amount) ||
            !Number.isSafeInteger(amount) ||
            amount <= 0
        ) {
            console.error(
                "Invalid server-side payment amount.",
                {
                    plan:
                        paymentPlan,
                }
            );

            return res.status(500).json({
                success: false,
                message:
                    "Payment configuration error.",
            });
        }

        /**
         * ---------------------------------------
         * CALLBACK URL
         * ---------------------------------------
         */

        const callbackUrl =
            process.env
                .PAYMENT_CALLBACK_URL;

        if (
            !callbackUrl ||
            !/^https?:\/\//i.test(
                callbackUrl
            )
        ) {
            console.error(
                "PAYMENT_CALLBACK_URL is not configured correctly."
            );

            return res.status(500).json({
                success: false,
                message:
                    "Payment callback configuration error.",
            });
        }

        /**
         * ---------------------------------------
         * CURRENT SUBSCRIPTION
         * ---------------------------------------
         */

        const currentSubscription =
            await Subscription.findOne({
                user: req.userId,
            });

        const now =
            new Date();

        let isCurrentlyActive =
            currentSubscription?.status ===
            "ACTIVE" &&
            (
                !currentSubscription.expiresAt ||
                currentSubscription.expiresAt >
                now
            );

        /**
         * Normalize expired subscriptions.
         */

        if (
            currentSubscription &&
            currentSubscription.status ===
            "ACTIVE" &&
            currentSubscription.expiresAt &&
            currentSubscription.expiresAt <=
            now
        ) {
            currentSubscription.status =
                "EXPIRED";

            currentSubscription.cancelAtPeriodEnd =
                false;

            currentSubscription.autoRenew =
                false;

            await currentSubscription.save();

            isCurrentlyActive = false;

            console.log(
                `[SUBSCRIPTION] Expired subscription ${String(
                    currentSubscription._id
                )}`
            );
        }

        /**
         * ---------------------------------------
         * EFFECTIVE CURRENT PLAN
         * ---------------------------------------
         */

        const currentPlan: PaymentPlan =
            isCurrentlyActive &&
                currentSubscription
                ? currentSubscription.plan
                : "FREE";

        console.log(
            "[SUBSCRIPTION] Payment initialization:",
            {
                userId:
                    req.userId,

                requestedPlan:
                    paymentPlan,

                storedPlan:
                    currentSubscription?.plan,

                storedStatus:
                    currentSubscription?.status,

                effectiveCurrentPlan:
                    currentPlan,

                isCurrentlyActive,
            }
        );

        /**
         * ---------------------------------------
         * SAME PLAN
         * ---------------------------------------
         */

        if (
            isCurrentlyActive &&
            currentPlan ===
            paymentPlan
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "You are already on this plan.",
            });
        }

        /**
         * ---------------------------------------
         * DOWNGRADE
         * ---------------------------------------
         */

        if (
            isCurrentlyActive &&
            entitlementService.canDowngrade(
                currentPlan,
                paymentPlan
            )
        ) {
            const subscription =
                await schedulePlanChange(
                    req.userId,
                    paymentPlan
                );

            return res.status(200).json({
                success: true,
                scheduled: true,
                subscription,
                message:
                    `Your plan will change to ${paymentPlan} when your current subscription ends.`,
            });
        }

        /**
         * ---------------------------------------
         * PROVIDER SERVICE
         * ---------------------------------------
         */

        const providerService =
            getPaymentProviderService(
                providerName
            );

        /**
         * ---------------------------------------
         * UNIQUE SERVER-GENERATED REFERENCE
         * ---------------------------------------
         */

        const reference =
            `PAY-${crypto
                .randomUUID()
                .replace(/-/g, "")}`;

        /**
         * ---------------------------------------
         * CREATE PAYMENT
         * ---------------------------------------
         *
         * The server controls:
         *
         * - user
         * - provider
         * - reference
         * - plan
         * - amount
         * - status
         */

        const payment =
            await Payment.create({
                user:
                    user._id,

                provider:
                    providerName,

                reference,

                plan:
                    paymentPlan,

                amount,

                status:
                    "PENDING",

                metadata: {
                    userId:
                        String(
                            user._id
                        ),

                    plan:
                        paymentPlan,
                },
            });

        try {
            /**
             * -----------------------------------
             * INITIALIZE PROVIDER PAYMENT
             * -----------------------------------
             */

            const result =
                await providerService.initializePayment(
                    {
                        email,

                        amount,

                        reference,

                        callbackUrl,

                        metadata: {
                            userId:
                                String(
                                    user._id
                                ),

                            plan:
                                paymentPlan,

                            paymentId:
                                String(
                                    payment._id
                                ),
                        },
                    }
                );

            if (
                !result.authorizationUrl ||
                typeof result.authorizationUrl !==
                "string"
            ) {
                throw new Error(
                    "Payment provider did not return a valid authorization URL."
                );
            }

            /**
             * -----------------------------------
             * CANCEL OLDER PENDING PAYMENTS
             * -----------------------------------
             *
             * Only cancel older payments after
             * the new payment was successfully
             * initialized.
             */

            await Payment.updateMany(
                {
                    user:
                        user._id,

                    provider:
                        providerName,

                    plan:
                        paymentPlan,

                    status:
                        "PENDING",

                    _id: {
                        $ne:
                            payment._id,
                    },
                },
                {
                    $set: {
                        status:
                            "CANCELLED",
                    },
                }
            );

            /**
             * -----------------------------------
             * SAFE RESPONSE
             * -----------------------------------
             */

            return res.status(200).json({
                success: true,

                provider:
                    providerName,

                plan:
                    paymentPlan,

                reference,

                authorizationUrl:
                    result.authorizationUrl,
            });
        } catch (providerError) {
            /**
             * Provider initialization failed.
             *
             * Do not leave the payment in
             * PENDING forever.
             */

            try {
                payment.status =
                    "FAILED";

                await payment.save();
            } catch (saveError) {
                console.error(
                    "Failed to mark payment initialization as failed:",
                    saveError
                );
            }

            throw providerError;
        }
    } catch (error) {
        console.error(
            "Initialize Payment Error:",
            error instanceof Error
                ? error.message
                : "Unknown error"
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to initialize payment.",
        });
    }
};

/**
 * ==========================================
 * VERIFY PAYMENT
 * ==========================================
 */
export const verifyPayment = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        /**
         * ---------------------------------------
         * AUTHENTICATION
         * ---------------------------------------
         */

        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message:
                    "Unauthorized",
            });
        }

        /**
         * ---------------------------------------
         * REFERENCE VALIDATION
         * ---------------------------------------
         */

        const reference =
            String(
                req.params.reference ??
                ""
            ).trim();

        if (
            !isValidPaymentReference(
                reference
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid payment reference.",
            });
        }

        /**
         * ---------------------------------------
         * FIND USER PAYMENT
         * ---------------------------------------
         */

        const payment =
            await Payment.findOne({
                reference,

                user:
                    req.userId,
            });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message:
                    "Payment not found.",
            });
        }

        /**
         * ---------------------------------------
         * ALREADY SUCCESSFUL
         * ---------------------------------------
         *
         * Payment finalization is idempotent.
         */

        if (
            payment.status ===
            "SUCCESS"
        ) {
            const subscription =
                await applySubscriptionUpgrade(
                    payment
                );

            return res.status(200).json({
                success: true,

                payment: {
                    id:
                        payment._id,

                    reference:
                        payment.reference,

                    provider:
                        payment.provider,

                    plan:
                        payment.plan,

                    amount:
                        payment.amount,

                    status:
                        payment.status,

                    paidAt:
                        payment.paidAt,

                    createdAt:
                        payment.createdAt,
                },

                subscription,
            });
        }

        /**
         * ---------------------------------------
         * PROVIDER SERVICE
         * ---------------------------------------
         */

        const providerService =
            getPaymentProviderService(
                payment.provider
            );

        /**
         * ---------------------------------------
         * VERIFY DIRECTLY WITH PROVIDER
         * ---------------------------------------
         */

        const verification =
            await providerService.verifyPayment(
                reference
            );

        /**
         * ---------------------------------------
         * PROVIDER SUCCESS CHECK
         * ---------------------------------------
         */

        if (!verification.success) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment verification failed.",
            });
        }

        if (
            typeof verification.status !==
            "string" ||
            verification.status
                .toLowerCase() !==
            "success"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment was not successful.",
            });
        }

        /**
         * ---------------------------------------
         * AMOUNT VERIFICATION
         * ---------------------------------------
         *
         * This is extremely important.
         *
         * Never trust provider success alone.
         */

        if (
            !amountsMatch(
                payment.amount,
                verification.amount
            )
        ) {
            console.error(
                "Payment amount mismatch.",
                {
                    reference:
                        payment.reference,

                    provider:
                        payment.provider,

                    expected:
                        payment.amount,

                    received:
                        verification.amount,
                }
            );

            return res.status(400).json({
                success: false,
                message:
                    "Payment amount verification failed.",
            });
        }

        /**
         * ---------------------------------------
         * FINALIZE PAYMENT
         * ---------------------------------------
         */

        payment.status =
            "SUCCESS";

        payment.paidAt =
            getSafePaidAt(
                verification.paidAt
            );

        await payment.save();

        /**
         * ---------------------------------------
         * APPLY SUBSCRIPTION
         * ---------------------------------------
         */

        const subscription =
            await applySubscriptionUpgrade(
                payment
            );

        /**
         * ---------------------------------------
         * SAFE RESPONSE
         * ---------------------------------------
         */

        return res.status(200).json({
            success: true,

            payment: {
                id:
                    payment._id,

                reference:
                    payment.reference,

                provider:
                    payment.provider,

                plan:
                    payment.plan,

                amount:
                    payment.amount,

                status:
                    payment.status,

                paidAt:
                    payment.paidAt,

                createdAt:
                    payment.createdAt,
            },

            subscription,
        });
    } catch (error) {
        console.error(
            "Verify Payment Error:",
            error instanceof Error
                ? error.message
                : "Unknown error"
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to verify payment.",
        });
    }
};

/**
 * ==========================================
 * PAYMENT SUCCESS REDIRECT
 * ==========================================
 */
export const paymentSuccess = async (
    req: Request,
    res: Response
) => {
    return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
    <title>Payment Successful</title>
    <meta charset="utf-8" />
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    />
</head>
<body style="
    font-family: Arial, sans-serif;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    margin:0;
    background:#F8FAFC;
">
    <div style="text-align:center;">
        <h2>Payment Successful</h2>
        <p>Returning to LocalLift...</p>
    </div>
</body>
</html>
`);
};

/**
 * ==========================================
 * PAYMENT FAILED REDIRECT
 * ==========================================
 */
export const paymentFailed = async (
    req: Request,
    res: Response
) => {
    return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
    <title>Payment Failed</title>
    <meta charset="utf-8" />
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    />
</head>
<body style="
    font-family: Arial, sans-serif;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    margin:0;
    background:#F8FAFC;
">
    <div style="text-align:center;">
        <h2>Payment Failed</h2>
        <p>You can close this page and return to the app.</p>
    </div>
</body>
</html>
`);
};

/**
 * ==========================================
 * KORA WEBHOOK
 * ==========================================
 *
 * IMPORTANT:
 *
 * The route must use:
 *
 * express.raw({
 *     type: "application/json"
 * })
 *
 * BEFORE this controller.
 */
export const koraWebhook = async (
    req: Request,
    res: Response
) => {
    try {
        const providerService =
            getPaymentProviderService(
                "KORA"
            );

        /**
         * Preserve the exact raw request body.
         */
        const rawBody =
            getRawWebhookBody(req);

        /**
         * Parse JSON only after retaining
         * the original raw body.
         */
        const rawPayload =
            parseWebhookBody(
                rawBody
            );

        const signature =
            getHeaderValue(
                req.headers[
                "x-korapay-signature"
                ]
            );

        /**
         * parseWebhook performs:
         *
         * 1. Signature verification
         * 2. Payload validation
         * 3. Event validation
         * 4. Status validation
         * 5. Payload normalization
         */
        const payload =
            await providerService.parseWebhook(
                rawPayload,
                signature
            );

        /**
         * Normalized status is always uppercase.
         */
        if (
            payload.status !==
            "SUCCESS"
        ) {
            return res.sendStatus(
                200
            );
        }

        /**
         * ---------------------------------------
         * IDEMPOTENCY CHECK
         * ---------------------------------------
         */

        const exists =
            await WebhookEvent.findOne({
                provider:
                    "KORA",

                reference:
                    payload.reference,

                event:
                    payload.event,
            }).select("_id");

        if (exists) {
            return res.sendStatus(
                200
            );
        }

        /**
         * ---------------------------------------
         * STORE VERIFIED WEBHOOK
         * ---------------------------------------
         */

        try {
            await WebhookEvent.create({
                provider:
                    "KORA",

                reference:
                    payload.reference,

                event:
                    payload.event,

                payload:
                    serializeWebhookPayload(
                        payload
                    ),

                processed:
                    false,

                attempts:
                    0,
            });
        } catch (error: any) {
            /**
             * Two identical webhooks may arrive
             * at exactly the same time.
             *
             * A unique database index protects
             * against duplicate processing.
             */

            if (
                error?.code ===
                11000
            ) {
                return res.sendStatus(
                    200
                );
            }

            throw error;
        }

        /**
         * Queue only AFTER webhook persistence.
         */
        await addPaymentJob(
            payload.reference
        );

        return res.sendStatus(
            200
        );
    } catch (error) {
        console.error(
            "Kora Webhook Error:",
            error instanceof Error
                ? error.message
                : "Unknown error"
        );

        /**
         * 500 allows Kora to retry.
         */
        return res.sendStatus(
            500
        );
    }
};

/**
 * ==========================================
 * PAYSTACK WEBHOOK
 * ==========================================
 *
 * IMPORTANT:
 *
 * The route must use:
 *
 * express.raw({
 *     type: "application/json"
 * })
 *
 * BEFORE this controller.
 */
export const paystackWebhook = async (
    req: Request,
    res: Response
) => {
    try {
        const providerService =
            getPaymentProviderService(
                "PAYSTACK"
            );

        /**
         * Preserve exact raw body.
         */
        const rawBody =
            getRawWebhookBody(req);

        const rawPayload =
            parseWebhookBody(
                rawBody
            );

        const signature =
            getHeaderValue(
                req.headers[
                "x-paystack-signature"
                ]
            );

        /**
         * Verify and normalize webhook.
         */
        const payload =
            await providerService.parseWebhook(
                rawPayload,
                signature
            );

        /**
         * Normalized successful Paystack
         * webhooks have:
         *
         * event  = charge.success
         * status = SUCCESS
         */
        if (
            payload.status !==
            "SUCCESS"
        ) {
            return res.sendStatus(
                200
            );
        }

        /**
         * ---------------------------------------
         * IDEMPOTENCY CHECK
         * ---------------------------------------
         */

        const exists =
            await WebhookEvent.findOne({
                provider:
                    "PAYSTACK",

                reference:
                    payload.reference,

                event:
                    payload.event,
            }).select("_id");

        if (exists) {
            return res.sendStatus(
                200
            );
        }

        /**
         * ---------------------------------------
         * STORE VERIFIED WEBHOOK
         * ---------------------------------------
         */

        try {
            await WebhookEvent.create({
                provider:
                    "PAYSTACK",

                reference:
                    payload.reference,

                event:
                    payload.event,

                payload:
                    serializeWebhookPayload(
                        payload
                    ),

                processed:
                    false,

                attempts:
                    0,
            });
        } catch (error: any) {
            /**
             * Duplicate webhook race condition.
             */

            if (
                error?.code ===
                11000
            ) {
                return res.sendStatus(
                    200
                );
            }

            throw error;
        }

        /**
         * Queue only after persistence.
         */
        await addPaymentJob(
            payload.reference
        );

        return res.sendStatus(
            200
        );
    } catch (error) {
        console.error(
            "Paystack Webhook Error:",
            error instanceof Error
                ? error.message
                : "Unknown error"
        );

        /**
         * 500 allows Paystack to retry.
         */
        return res.sendStatus(
            500
        );
    }
};

/**
 * ==========================================
 * PAYMENT HISTORY
 * ==========================================
 */
export const getPaymentHistory = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        /**
         * ---------------------------------------
         * AUTHENTICATION
         * ---------------------------------------
         */

        if (!req.userId) {
            return res.status(401).json({
                success: false,
                message:
                    "Unauthorized",
            });
        }

        /**
         * ---------------------------------------
         * FETCH HISTORY
         * ---------------------------------------
         *
         * Never expose:
         *
         * - providerResponse
         * - metadata
         * - internal fields
         */

        const payments =
            await Payment.find({
                user:
                    req.userId,
            })
                .sort({
                    createdAt: -1,
                })
                .select(
                    "provider plan amount status paidAt createdAt reference"
                )
                .lean();

        return res.status(200).json({
            success: true,
            payments,
        });
    } catch (error) {
        console.error(
            "Get Payment History Error:",
            error instanceof Error
                ? error.message
                : "Unknown error"
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch payment history.",
        });
    }
};