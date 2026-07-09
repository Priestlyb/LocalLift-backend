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
 * Step 1:
 * Send registration OTP
 */
router.post(
  "/register/send-otp",
  registrationOtpLimiter,
  sendRegistrationOtp
);

/**
 * Step 2:
 * Verify OTP and create account
 */
router.post(
  "/register/verify",
  verifyOtpLimiter,
  verifyRegistration
);

/**
 * Resend registration OTP
 */
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
 * Google Sign-In / Sign-Up
 */
router.post(
  "/google",
  googleLogin
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
 * Current user's profile
 */
router.get(
  "/profile",
  protect,
  getProfile
);

/**
 * Delete current user
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
 * Invite staff member
 */
router.post(
  "/staff/invite",
  protect,
  authorize("CUSTOMER"),
  inviteStaff
);

export default router;