import { Router } from "express";

import {
  register,
  login,
  getProfile,
  logout,
  deleteUser,
  inviteStaff,
} from "../controllers/auth.controller";

import { protect, authorize } from "../middleware/auth.middleware";

const router = Router();

/**
 * =========================
 * PUBLIC ROUTES
 * =========================
 */
router.post("/register", register);
router.post("/login", login);

/**
 * =========================
 * PROTECTED ROUTES
 * =========================
 * Any logged-in user
 */
router.post("/logout", protect, logout);

router.get("/profile", protect, getProfile);

router.delete("/delete", protect, deleteUser);

/**
 * =========================
 * BUSINESS OWNER ROUTES
 * =========================
 * Only CUSTOMER role can invite staff
 */
router.post(
  "/staff/invite",
  protect,
  authorize("CUSTOMER"),
  inviteStaff
);

export default router;