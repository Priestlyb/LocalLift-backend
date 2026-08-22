import rateLimit from "express-rate-limit";

/**
 * ==========================================
 * SHARED RATE LIMIT CONFIGURATION
 * ==========================================
 */

const standardRateLimitOptions = {
    standardHeaders: "draft-8" as const,
    legacyHeaders: false,
};

/**
 * ==========================================
 * GLOBAL API RATE LIMITER
 * ==========================================
 *
 * Baseline protection for the entire API.
 *
 * Mount in app.ts:
 *
 * app.use(
 *     "/api/v1",
 *     globalApiLimiter
 * );
 *
 * Sensitive endpoints should still have
 * their own stricter limiters.
 */
export const globalApiLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        /**
         * 300 requests per 15 minutes
         * per client IP.
         */
        limit: 300,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many requests. Please try again later.",
        },
    });

/**
 * ==========================================
 * REGISTRATION OTP RATE LIMITER
 * ==========================================
 *
 * Protects:
 *
 * POST /register/send-otp
 * POST /register/resend-otp
 *
 * Prevents:
 *
 * - OTP spam
 * - Email abuse
 * - Automated registration
 * - Excessive resend attempts
 *
 * 5 requests per 15 minutes per IP.
 *
 * IMPORTANT:
 *
 * The controller should ALSO enforce:
 *
 * - Per-email cooldown
 * - Maximum OTP generations
 * - OTP expiration
 * - Maximum verification attempts
 */
export const registrationOtpLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 5,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many verification code requests. Please try again later.",
        },
    });

/**
 * ==========================================
 * REGISTRATION OTP VERIFICATION LIMITER
 * ==========================================
 *
 * Protects:
 *
 * POST /register/verify
 *
 * Prevents:
 *
 * - OTP brute force
 * - Automated guessing
 * - Repeated verification attempts
 *
 * 10 requests per 15 minutes per IP.
 *
 * The RegistrationOtp document should ALSO
 * enforce a maximum number of failed attempts.
 */
export const registrationVerifyOtpLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 10,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many verification attempts. Please try again later.",
        },
    });

/**
 * ==========================================
 * PASSWORD RESET REQUEST LIMITER
 * ==========================================
 *
 * Protects:
 *
 * POST /password/forgot
 *
 * Prevents:
 *
 * - Email bombing
 * - Password reset abuse
 * - Account enumeration attempts
 * - Automated reset requests
 *
 * 5 requests per 15 minutes per IP.
 *
 * The controller should ALSO enforce a
 * per-email cooldown.
 */
export const passwordResetLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 5,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many password reset requests. Please try again later.",
        },
    });

/**
 * ==========================================
 * PASSWORD RESET OTP VERIFICATION LIMITER
 * ==========================================
 *
 * Protects:
 *
 * POST /password/verify-otp
 *
 * Prevents brute-force guessing of
 * password reset OTPs.
 *
 * 10 requests per 15 minutes per IP.
 *
 * PasswordResetOtp should ALSO enforce its
 * own maximum verification attempts.
 */
export const passwordResetVerifyOtpLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 10,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many verification attempts. Please try again later.",
        },
    });

/**
 * ==========================================
 * PASSWORD RESET LIMITER
 * ==========================================
 *
 * Protects:
 *
 * POST /password/reset
 *
 * This is deliberately separate from the
 * OTP verification endpoint.
 *
 * Prevents repeated password-reset operations
 * even if an attacker obtains or repeatedly
 * submits valid/invalid reset credentials.
 *
 * 5 requests per 15 minutes per IP.
 */
export const passwordResetLimiterStrict =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 5,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many password reset attempts. Please try again later.",
        },
    });

/**
 * ==========================================
 * LOGIN RATE LIMITER
 * ==========================================
 *
 * Protects:
 *
 * POST /login
 *
 * Against:
 *
 * - Password brute force
 * - Credential stuffing
 * - Automated login attacks
 *
 * 10 requests per 15 minutes per IP.
 *
 * IMPORTANT:
 *
 * This is IP-based protection.
 *
 * For stronger production protection,
 * consider an additional limiter based on
 * normalized email/account identity.
 */
export const loginLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 10,

        ...standardRateLimitOptions,

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
 * Protects:
 *
 * POST /google
 *
 * Against excessive authentication
 * requests and automated abuse.
 *
 * 10 requests per 15 minutes per IP.
 */
export const googleLoginLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 10,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many authentication attempts. Please try again later.",
        },
    });

/**
 * ==========================================
 * AI GENERATION RATE LIMITER
 * ==========================================
 *
 * Protects expensive AI generation
 * endpoints.
 *
 * Example:
 *
 * POST /content/generate
 *
 * 5 requests per minute per IP.
 *
 * IMPORTANT:
 *
 * This should NOT be your only AI protection.
 *
 * You should ALSO enforce:
 *
 * - Authentication
 * - Subscription entitlement
 * - User usage limits
 * - Monthly/daily generation limits
 * - Provider spending limits
 */
export const aiGenerationLimiter =
    rateLimit({
        windowMs: 60 * 1000,

        limit: 5,

        ...standardRateLimitOptions,

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
 * Protects user-triggered payment endpoints.
 *
 * Examples:
 *
 * POST /payments/initialize
 * GET  /payments/verify/:reference
 *
 * 10 requests per minute per IP.
 *
 * IMPORTANT:
 *
 * DO NOT apply this limiter to payment
 * provider webhooks.
 *
 * Webhooks should instead use:
 *
 * - Signature verification
 * - Idempotency
 * - Reference validation
 * - Event validation
 */
export const paymentLimiter =
    rateLimit({
        windowMs: 60 * 1000,

        limit: 10,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many payment requests. Please try again later.",
        },
    });

/**
 * ==========================================
 * STAFF INVITATION RATE LIMITER
 * ==========================================
 *
 * Protects:
 *
 * POST /staff/invite
 *
 * Prevents a compromised business account
 * from sending a large number of invitation
 * emails.
 *
 * 10 invitations per hour per IP.
 *
 * IMPORTANT:
 *
 * Also enforce limits based on the authenticated
 * business owner/account.
 */
export const staffInvitationLimiter =
    rateLimit({
        windowMs: 60 * 60 * 1000,

        limit: 10,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many staff invitations. Please try again later.",
        },
    });

/**
 * ==========================================
 * STAFF INVITATION ACCEPTANCE LIMITER
 * ==========================================
 *
 * Protects:
 *
 * POST /staff/accept-invitation
 *
 * Prevents automated brute-force attempts
 * against invitation tokens.
 *
 * 10 requests per 15 minutes per IP.
 *
 * IMPORTANT:
 *
 * Your invitation token should also be
 * cryptographically random and stored as
 * a SHA-256 hash in MongoDB.
 */
export const staffInvitationAcceptanceLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 10,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many invitation attempts. Please try again later.",
        },
    });

/**
 * ==========================================
 * ACCOUNT DELETION RATE LIMITER
 * ==========================================
 *
 * Protects destructive account operations.
 *
 * Should be combined with:
 *
 * - Authentication
 * - Current-password verification
 * - Re-authentication
 * - Transaction PIN where applicable
 *
 * 3 requests per hour per IP.
 */
export const accountDeletionLimiter =
    rateLimit({
        windowMs: 60 * 60 * 1000,

        limit: 3,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many account deletion attempts. Please try again later.",
        },
    });

/**
 * ==========================================
 * PROFILE UPDATE RATE LIMITER
 * ==========================================
 *
 * Protects:
 *
 * PUT /profile
 *
 * Prevents automated profile modification
 * attempts.
 *
 * 20 requests per 15 minutes per IP.
 */
export const profileUpdateLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 20,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many profile update requests. Please try again later.",
        },
    });

/**
 * ==========================================
 * LOGOUT RATE LIMITER
 * ==========================================
 *
 * Logout normally does not require aggressive
 * rate limiting, but this prevents unnecessary
 * abuse of the endpoint.
 *
 * 30 requests per 15 minutes per IP.
 */
export const logoutLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 30,

        ...standardRateLimitOptions,

        message: {
            success: false,
            message:
                "Too many logout requests. Please try again later.",
        },
    });