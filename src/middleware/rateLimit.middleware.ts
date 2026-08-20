import rateLimit from "express-rate-limit";

/**
 * ==========================================
 * GLOBAL API RATE LIMITER
 * ==========================================
 *
 * Protects all API endpoints from excessive
 * requests.
 *
 * Mount in app.ts:
 *
 * app.use("/api/v1", globalApiLimiter);
 *
 * This provides a baseline layer of protection.
 * Sensitive endpoints should have their own
 * stricter limiters below.
 */
export const globalApiLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes

        // Maximum requests from a single
        // client within the window.
        limit: 300,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many requests. Please try again later.",
        },
    });

/**
 * ==========================================
 * REGISTRATION OTP LIMITER
 * ==========================================
 *
 * Limits how frequently a user can request
 * registration OTPs.
 *
 * Helps prevent:
 * - OTP spam
 * - Email/SMS abuse
 * - Automated registration attacks
 */
export const registrationOtpLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes

        // Maximum OTP requests.
        limit: 5,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many OTP requests. Please try again in 15 minutes.",
        },
    });

/**
 * ==========================================
 * OTP VERIFICATION LIMITER
 * ==========================================
 *
 * Limits OTP verification attempts.
 *
 * Helps prevent brute-force attacks against
 * verification codes.
 */
export const verifyOtpLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes

        // Maximum verification attempts.
        limit: 10,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many verification attempts. Please try again later.",
        },
    });

/**
 * ==========================================
 * LOGIN RATE LIMITER
 * ==========================================
 *
 * Protects the normal login endpoint from
 * password brute-force attacks.
 *
 * 10 attempts per 15 minutes per client.
 */
export const loginLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes

        // Maximum login attempts.
        limit: 10,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many login attempts. Please try again later.",
        },
    });

/**
 * ==========================================
 * GOOGLE LOGIN RATE LIMITER
 * ==========================================
 *
 * Protects the Google authentication endpoint
 * from excessive authentication requests.
 *
 * 10 attempts per 15 minutes per client.
 */
export const googleLoginLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes

        // Maximum Google authentication
        // requests.
        limit: 10,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many login attempts. Please try again later.",
        },
    });

/**
 * ==========================================
 * AI GENERATION RATE LIMITER
 * ==========================================
 *
 * Protects expensive AI generation endpoints.
 *
 * This is intentionally much stricter than
 * the global API limiter because AI requests
 * can consume external provider credits.
 *
 * 5 requests per minute per client.
 *
 * Apply to:
 *
 * POST /api/v1/content/generate
 */
export const aiGenerationLimiter =
    rateLimit({
        windowMs: 60 * 1000, // 1 minute

        // Maximum AI generation requests.
        limit: 5,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many generation requests. Please wait a moment and try again.",
        },
    });

/**
 * ==========================================
 * PAYMENT RATE LIMITER
 * ==========================================
 *
 * Protects user-triggered payment operations
 * such as:
 *
 * POST /payments/initialize
 * GET  /payments/verify/:reference
 *
 * Do NOT apply this limiter to payment
 * provider webhooks.
 *
 * 10 requests per minute per client.
 */
export const paymentLimiter =
    rateLimit({
        windowMs: 60 * 1000, // 1 minute

        // Maximum payment requests.
        limit: 10,

        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message:
                "Too many payment requests. Please try again later.",
        },
    });