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
} from "../middleware/rateLimit.middleware";

const router = Router();

/**
 * ==========================================
 * PUBLIC ROUTES
 * ==========================================
 */

/**
 * Registration
 */
router.post(
  "/register/send-otp",
  registrationOtpLimiter,
  sendRegistrationOtp
);

router.post(
  "/register/verify",
  verifyOtpLimiter,
  verifyRegistration
);

router.post(
  "/register/resend-otp",
  registrationOtpLimiter,
  resendRegistrationOtp
);

/**
 * Login
 */
router.post("/login", login);

/**
 * Google Login
 */
router.post("/google", googleLogin);

/**
 * Forgot Password
 */
router.post(
  "/password/forgot",
  registrationOtpLimiter,
  forgotPassword
);

/**
 * Verify Password Reset OTP
 */
router.post(
  "/password/verify-otp",
  verifyOtpLimiter,
  verifyResetOtp
);

/**
 * Reset Password
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

router.post(
  "/logout",
  protect,
  logout
);

router.get(
  "/profile",
  protect,
  getProfile
);

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

router.post(
  "/staff/invite",
  protect,
  authorize("CUSTOMER"),
  inviteStaff
);

export default router;