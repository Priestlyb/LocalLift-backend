import rateLimit from "express-rate-limit";

/**
 * Limit sending registration OTPs.
 */
export const registrationOtpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message:
            "Too many OTP requests. Please try again in 15 minutes.",
    },
});

/**
 * Limit OTP verification attempts.
 */
export const verifyOtpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message:
            "Too many verification attempts. Please try again later.",
    },
});