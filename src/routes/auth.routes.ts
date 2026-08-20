import { Router } from "express";

import {
  sendRegistrationOtp,
  verifyRegistration,
  resendRegistrationOtp,
  login,
  googleLogin,
  getProfile,
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
  verifyOtpLimiter,
  loginLimiter,
  googleLoginLimiter,
} from "../middleware/rateLimit.middleware";

const router = Router();

/**
 * ==========================================
 * PUBLIC ROUTES
 * ==========================================
 */

/**
 * REGISTRATION
 *
 * Send registration OTP.
 *
 * Rate limited to prevent OTP abuse.
 */
router.post(
  "/register/send-otp",
  registrationOtpLimiter,
  sendRegistrationOtp
);

/**
 * Verify registration OTP.
 *
 * Rate limited to prevent brute-force
 * verification attempts.
 */
router.post(
  "/register/verify",
  verifyOtpLimiter,
  verifyRegistration
);

/**
 * Resend registration OTP.
 *
 * Uses the same OTP request limiter as
 * the initial OTP request.
 */
router.post(
  "/register/resend-otp",
  registrationOtpLimiter,
  resendRegistrationOtp
);

/**
 * LOGIN
 *
 * Strictly rate limited to reduce the risk
 * of password brute-force attacks.
 */
router.post(
  "/login",
  loginLimiter,
  login
);

/**
 * GOOGLE LOGIN
 *
 * Rate limited to prevent excessive
 * authentication requests.
 */
router.post(
  "/google",
  googleLoginLimiter,
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
 * Uses the OTP request limiter because this
 * endpoint can trigger an email/SMS delivery.
 */
router.post(
  "/password/forgot",
  registrationOtpLimiter,
  forgotPassword
);

/**
 * Verify password-reset OTP.
 *
 * Uses the OTP verification limiter to
 * prevent brute-force OTP guessing.
 */
router.post(
  "/password/verify-otp",
  verifyOtpLimiter,
  verifyResetOtp
);

/**
 * Reset password.
 *
 * Uses the verification limiter as an
 * additional protection against repeated
 * password-reset attempts.
 */
router.post(
  "/password/reset",
  verifyOtpLimiter,
  resetPassword
);

/**
 * ==========================================
 * PROTECTED ROUTES
 * ==========================================
 */

/**
 * Logout
 */
router.post(
  "/logout",
  protect,
  logout
);

/**
 * Get authenticated user's profile.
 */
router.get(
  "/profile",
  protect,
  getProfile
);

/**
 * Delete authenticated user.
 */
router.delete(
  "/delete",
  protect,
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
 * Only business customers can invite staff.
 */
router.post(
  "/staff/invite",
  protect,
  authorize("CUSTOMER"),
  inviteStaff
);

export default router;