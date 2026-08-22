import { Router } from "express";

import {
  sendRegistrationOtp,
  verifyRegistration,
  resendRegistrationOtp,
  login,
  googleLogin,
  getProfile,
  updateProfile,
  logout,
  deleteUser,
  inviteStaff,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/auth.controller";

import {
  protect,
  authorize,
} from "../middleware/auth.middleware";

import {
  registrationOtpLimiter,
  registrationVerifyOtpLimiter,
  passwordResetLimiter,
  passwordResetVerifyOtpLimiter,
  passwordResetLimiterStrict,
  loginLimiter,
  googleLoginLimiter,
  staffInvitationLimiter,
  accountDeletionLimiter,
  profileUpdateLimiter,
  logoutLimiter,
} from "../middleware/rateLimit.middleware";

import { validate } from "../middleware/validation.middleware";

import {
  registerValidation,
  verifyRegistrationValidation,
  resendRegistrationOtpValidation,
  loginValidation,
  googleLoginValidation,
  forgotPasswordValidation,
  verifyResetOtpValidation,
  resetPasswordValidation,
  updateProfileValidation,
  inviteStaffValidation,
} from "../validators/auth.validators";

const router = Router();

/**
 * ==========================================
 * PUBLIC AUTHENTICATION ROUTES
 * ==========================================
 */

/**
 * ==========================================
 * REGISTRATION
 * ==========================================
 */

/**
 * Send registration OTP.
 *
 * Security layers:
 *
 * - Request rate limiting
 * - Input validation
 * - Controller-level email cooldown
 * - OTP generation using crypto.randomInt()
 * - Hashed OTP stored in MongoDB
 */
router.post(
  "/register/send-otp",

  registrationOtpLimiter,

  registerValidation,

  validate,

  sendRegistrationOtp
);

/**
 * Verify registration OTP.
 *
 * Security layers:
 *
 * - Registration-specific verification limiter
 * - Input validation
 * - OTP format validation
 * - Hashed OTP comparison
 * - Maximum verification attempts
 * - OTP expiration
 */
router.post(
  "/register/verify",

  registrationVerifyOtpLimiter,

  verifyRegistrationValidation,

  validate,

  verifyRegistration
);

/**
 * Resend registration OTP.
 *
 * Security layers:
 *
 * - OTP request rate limiter
 * - Input validation
 * - Controller-level 60-second cooldown
 * - Maximum resend attempts
 * - Cryptographically secure OTP generation
 */
router.post(
  "/register/resend-otp",

  registrationOtpLimiter,

  resendRegistrationOtpValidation,

  validate,

  resendRegistrationOtp
);

/**
 * ==========================================
 * LOGIN
 * ==========================================
 */

/**
 * Normal email/password login.
 *
 * Security layers:
 *
 * - Strict login rate limiter
 * - Email validation
 * - Password validation
 * - Password hash comparison
 * - Generic invalid-credentials response
 */
router.post(
  "/login",

  loginLimiter,

  loginValidation,

  validate,

  login
);

/**
 * ==========================================
 * GOOGLE AUTHENTICATION
 * ==========================================
 */

/**
 * Google login.
 *
 * Security layers:
 *
 * - Google authentication rate limiter
 * - ID token validation
 * - Google token verification
 * - Google email verification
 */
router.post(
  "/google",

  googleLoginLimiter,

  googleLoginValidation,

  validate,

  googleLogin
);

/**
 * ==========================================
 * PASSWORD RECOVERY
 * ==========================================
 */

/**
 * Request password-reset OTP.
 *
 * Security layers:
 *
 * - Dedicated password-reset rate limiter
 * - Email validation
 * - Controller-level email cooldown
 * - Generic response to prevent
 *   account enumeration
 * - Hashed OTP storage
 */
router.post(
  "/password/forgot",

  passwordResetLimiter,

  forgotPasswordValidation,

  validate,

  forgotPassword
);

/**
 * Verify password-reset OTP.
 *
 * Security layers:
 *
 * - Password-reset-specific OTP limiter
 * - Email validation
 * - OTP format validation
 * - OTP expiration
 * - Maximum verification attempts
 */
router.post(
  "/password/verify-otp",

  passwordResetVerifyOtpLimiter,

  verifyResetOtpValidation,

  validate,

  verifyResetOtp
);

/**
 * Reset password.
 *
 * Security layers:
 *
 * - Strict password-reset limiter
 * - Password-reset OTP limiter
 * - Strong password validation
 * - OTP validation
 * - OTP expiration
 * - Maximum OTP verification attempts
 * - Password hashing
 */
router.post(
  "/password/reset",

  passwordResetLimiterStrict,

  passwordResetVerifyOtpLimiter,

  resetPasswordValidation,

  validate,

  resetPassword
);

/**
 * ==========================================
 * PROTECTED AUTHENTICATION ROUTES
 * ==========================================
 */

/**
 * Logout.
 *
 * Security layers:
 *
 * - Authentication required
 * - Logout-specific rate limiter
 *
 * NOTE:
 *
 * Because JWT authentication is currently
 * stateless, the client must discard its
 * access token.
 */
router.post(
  "/logout",

  protect,

  logoutLimiter,

  logout
);

/**
 * ==========================================
 * USER PROFILE
 * ==========================================
 */

/**
 * Get authenticated user's profile.
 *
 * Security:
 *
 * - Valid JWT required
 * - User must still exist
 * - Password excluded from response
 */
router.get(
  "/profile",

  protect,

  getProfile
);

/**
 * Update authenticated user's profile.
 *
 * Security layers:
 *
 * - Authentication required
 * - Current password required
 * - Input validation
 * - Email uniqueness check
 * - Profile update rate limiter
 */
router.put(
  "/profile",

  protect,

  profileUpdateLimiter,

  updateProfileValidation,

  validate,

  updateProfile
);

/**
 * ==========================================
 * ACCOUNT DELETION
 * ==========================================
 */

/**
 * Delete authenticated user.
 *
 * Security layers:
 *
 * - Authentication required
 * - Account deletion rate limiter
 *
 * IMPORTANT:
 *
 * The controller should additionally require
 * current-password verification or another
 * strong re-authentication mechanism before
 * permanently deleting the account.
 */
router.delete(
  "/delete",

  protect,

  accountDeletionLimiter,

  deleteUser
);

/**
 * ==========================================
 * BUSINESS OWNER ROUTES
 * ==========================================
 */

/**
 * Invite a staff member.
 *
 * Security layers:
 *
 * - Authentication required
 * - CUSTOMER role required
 * - Staff invitation rate limiter
 * - Input validation
 * - Cryptographically secure invitation token
 * - SHA-256 hashed token stored in MongoDB
 * - Invitation expiration
 * - Pending invitation checks
 */
router.post(
  "/staff/invite",

  protect,

  authorize("CUSTOMER"),

  staffInvitationLimiter,

  inviteStaffValidation,

  validate,

  inviteStaff
);

/**
 * ==========================================
 * EXPORT ROUTER
 * ==========================================
 */

export default router;