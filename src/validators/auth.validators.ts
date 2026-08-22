import {
    body,
} from "express-validator";

/**
 * ==========================================
 * CONSTANTS
 * ==========================================
 */

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;

const EMAIL_MAX_LENGTH = 254;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const OTP_LENGTH = 6;

/**
 * ==========================================
 * REGEX
 * ==========================================
 */

/**
 * Allows normal human names containing:
 *
 * - Letters
 * - Spaces
 * - Hyphens
 * - Apostrophes
 * - Common accented characters
 *
 * Examples:
 *
 * John Doe
 * Mary-Jane
 * O'Connor
 * José
 */
const NAME_REGEX =
    /^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u;

/**
 * Exactly six numeric digits.
 */
const OTP_REGEX =
    /^\d{6}$/;

/**
 * Password must contain:
 *
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 *
 * Spaces are intentionally allowed inside passwords.
 */
const PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).+$/;

/**
 * Google ID tokens are JWTs.
 *
 * We intentionally do not attempt to fully
 * validate the JWT structure here because
 * GoogleService.verifyIdToken() is responsible
 * for cryptographic verification.
 *
 * This validator only prevents obviously invalid
 * or excessively large values from reaching the
 * authentication service.
 */
const GOOGLE_ID_TOKEN_MAX_LENGTH = 10_000;

/**
 * ==========================================
 * SHARED VALIDATORS
 * ==========================================
 */

/**
 * Email validator.
 *
 * Normalizes the email to lowercase and trims
 * surrounding whitespace.
 */
const emailValidator = body("email")
    .exists({
        checkFalsy: true,
    })
    .withMessage("Email is required.")

    .bail()

    .isString()
    .withMessage("Email must be a string.")

    .bail()

    .trim()

    .normalizeEmail({
        gmail_lowercase: true,
    })

    .isEmail()
    .withMessage("Please provide a valid email address.")

    .bail()

    .isLength({
        max: EMAIL_MAX_LENGTH,
    })
    .withMessage(
        `Email cannot exceed ${EMAIL_MAX_LENGTH} characters.`
    );

/**
 * Password validator.
 *
 * Requires:
 *
 * - 8-128 characters
 * - lowercase
 * - uppercase
 * - number
 * - special character
 */
const passwordValidator = body("password")
    .exists({
        checkFalsy: true,
    })
    .withMessage("Password is required.")

    .bail()

    .isString()
    .withMessage("Password must be a string.")

    .bail()

    .isLength({
        min: PASSWORD_MIN_LENGTH,
        max: PASSWORD_MAX_LENGTH,
    })
    .withMessage(
        `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`
    )

    .bail()

    .matches(PASSWORD_REGEX)
    .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
    );

/**
 * Registration name validator.
 */
const nameValidator = body("name")
    .exists({
        checkFalsy: true,
    })
    .withMessage("Name is required.")

    .bail()

    .isString()
    .withMessage("Name must be a string.")

    .bail()

    .trim()

    .isLength({
        min: NAME_MIN_LENGTH,
        max: NAME_MAX_LENGTH,
    })
    .withMessage(
        `Name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters.`
    )

    .bail()

    .matches(NAME_REGEX)
    .withMessage(
        "Name contains invalid characters."
    );

/**
 * OTP validator.
 */
const otpValidator = body("otp")
    .exists({
        checkFalsy: true,
    })
    .withMessage(
        "Verification code is required."
    )

    .bail()

    .customSanitizer((value) => {
        /**
         * Convert numeric OTP values to strings.
         *
         * This also allows JSON clients that
         * accidentally send 123456 instead of
         * "123456".
         */
        return String(value).trim();
    })

    .isLength({
        min: OTP_LENGTH,
        max: OTP_LENGTH,
    })
    .withMessage(
        `Verification code must be exactly ${OTP_LENGTH} digits.`
    )

    .bail()

    .matches(OTP_REGEX)
    .withMessage(
        "Verification code must contain only numbers."
    );

/**
 * ==========================================
 * REGISTRATION
 * ==========================================
 */

/**
 * POST /register/send-otp
 *
 * Validates:
 *
 * {
 *   name,
 *   email,
 *   password
 * }
 */
export const registerValidation = [
    nameValidator,

    emailValidator,

    passwordValidator,
];

/**
 * POST /register/verify
 *
 * Validates:
 *
 * {
 *   email,
 *   otp
 * }
 */
export const verifyRegistrationValidation = [
    emailValidator,

    otpValidator,
];

/**
 * POST /register/resend-otp
 *
 * Validates:
 *
 * {
 *   email
 * }
 */
export const resendRegistrationOtpValidation = [
    emailValidator,
];

/**
 * ==========================================
 * LOGIN
 * ==========================================
 */

/**
 * POST /login
 *
 * Validates:
 *
 * {
 *   email,
 *   password
 * }
 */
export const loginValidation = [
    emailValidator,

    body("password")
        .exists({
            checkFalsy: true,
        })
        .withMessage(
            "Password is required."
        )

        .bail()

        .isString()
        .withMessage(
            "Password must be a string."
        )

        .bail()

        .isLength({
            min: 1,
            max: PASSWORD_MAX_LENGTH,
        })
        .withMessage(
            `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`
        ),
];

/**
 * ==========================================
 * GOOGLE LOGIN
 * ==========================================
 */

/**
 * POST /google
 *
 * Validates:
 *
 * {
 *   idToken
 * }
 *
 * The token's cryptographic signature,
 * issuer, audience and expiration must
 * still be verified by GoogleService.
 */
export const googleLoginValidation = [
    body("idToken")
        .exists({
            checkFalsy: true,
        })
        .withMessage(
            "Google ID token is required."
        )

        .bail()

        .isString()
        .withMessage(
            "Google ID token must be a string."
        )

        .bail()

        .trim()

        .isLength({
            min: 100,
            max: GOOGLE_ID_TOKEN_MAX_LENGTH,
        })
        .withMessage(
            "Invalid Google ID token."
        ),
];

/**
 * ==========================================
 * PASSWORD RECOVERY
 * ==========================================
 */

/**
 * POST /password/forgot
 *
 * Validates:
 *
 * {
 *   email
 * }
 */
export const forgotPasswordValidation = [
    emailValidator,
];

/**
 * POST /password/verify-otp
 *
 * Validates:
 *
 * {
 *   email,
 *   otp
 * }
 */
export const verifyResetOtpValidation = [
    emailValidator,

    otpValidator,
];

/**
 * POST /password/reset
 *
 * Validates:
 *
 * {
 *   email,
 *   otp,
 *   newPassword
 * }
 */
export const resetPasswordValidation = [
    emailValidator,

    otpValidator,

    body("newPassword")
        .exists({
            checkFalsy: true,
        })
        .withMessage(
            "New password is required."
        )

        .bail()

        .isString()
        .withMessage(
            "New password must be a string."
        )

        .bail()

        .isLength({
            min: PASSWORD_MIN_LENGTH,
            max: PASSWORD_MAX_LENGTH,
        })
        .withMessage(
            `New password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`
        )

        .bail()

        .matches(PASSWORD_REGEX)
        .withMessage(
            "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        ),
];

/**
 * ==========================================
 * PROFILE
 * ==========================================
 */

/**
 * PUT /profile
 *
 * The controller already requires the
 * current password for profile changes.
 *
 * This validator validates:
 *
 * {
 *   name?,
 *   email?,
 *   currentPassword
 * }
 */
export const updateProfileValidation = [
    body("name")
        .optional({
            nullable: false,
        })

        .isString()
        .withMessage(
            "Name must be a string."
        )

        .bail()

        .trim()

        .isLength({
            min: NAME_MIN_LENGTH,
            max: NAME_MAX_LENGTH,
        })
        .withMessage(
            `Name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters.`
        )

        .bail()

        .matches(NAME_REGEX)
        .withMessage(
            "Name contains invalid characters."
        ),

    body("email")
        .optional({
            nullable: false,
        })

        .isString()
        .withMessage(
            "Email must be a string."
        )

        .bail()

        .trim()

        .normalizeEmail({
            gmail_lowercase: true,
        })

        .isEmail()
        .withMessage(
            "Please provide a valid email address."
        )

        .bail()

        .isLength({
            max: EMAIL_MAX_LENGTH,
        })
        .withMessage(
            `Email cannot exceed ${EMAIL_MAX_LENGTH} characters.`
        ),

    body("currentPassword")
        .exists({
            checkFalsy: true,
        })
        .withMessage(
            "Current password is required."
        )

        .bail()

        .isString()
        .withMessage(
            "Current password must be a string."
        )

        .bail()

        .isLength({
            min: 1,
            max: PASSWORD_MAX_LENGTH,
        })
        .withMessage(
            `Current password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`
        ),
];

/**
 * ==========================================
 * STAFF INVITATION
 * ==========================================
 */

/**
 * POST /staff/invite
 *
 * Validates:
 *
 * {
 *   name,
 *   email
 * }
 */
export const inviteStaffValidation = [
    nameValidator,

    emailValidator,
];