// routes/admin.routes.ts

import { Router } from "express";

import {
  getUsers,
  getBusinesses,
  getSubscriptions,
  deleteUserByAdmin,
} from "../controllers/admin.controller";

import {
  protect,
  authorize,
} from "../middleware/auth.middleware";

const router = Router();

/**
 * All admin routes require:
 * - Authentication
 * - ADMIN role
 */
router.use(
  protect,
  authorize("ADMIN")
);

/**
 * Get paginated users.
 *
 * Query Params:
 * - page (optional)
 * - limit (optional)
 */
router.get(
  "/users",
  getUsers
);

/**
 * Get paginated businesses.
 *
 * Query Params:
 * - page (optional)
 * - limit (optional)
 */
router.get(
  "/businesses",
  getBusinesses
);

/**
 * Get paginated subscriptions.
 *
 * Query Params:
 * - page (optional)
 * - limit (optional)
 */
router.get(
  "/subscriptions",
  getSubscriptions
);

/**
 * Permanently delete a user and
 * associated records.
 */
router.delete(
  "/users/:id",
  deleteUserByAdmin
);

export default router;