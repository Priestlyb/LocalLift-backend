import { Router } from "express";

import schedulerController from "../controllers/scheduler.controller";

import { protect } from "../middleware/auth.middleware";

import requireSubscription from "../middleware/requireSubscription.middleware";

import requireScheduler from "../middleware/requireScheduler.middleware";

const router = Router();

/**
 * All scheduler routes require:
 * - Authentication
 * - Active subscription
 * - Scheduler feature entitlement
 */
router.use(
  protect,
  requireSubscription,
  requireScheduler
);

/**
 * Create a scheduled post.
 */
router.post(
  "/",
  schedulerController.createSchedule
);

/**
 * Get all scheduled posts.
 */
router.get(
  "/",
  schedulerController.getSchedules
);

/**
 * Get one scheduled post.
 */
router.get(
  "/:id",
  schedulerController.getSchedule
);

/**
 * Update a scheduled post.
 */
router.put(
  "/:id",
  schedulerController.updateSchedule
);

/**
 * Cancel a scheduled post.
 */
router.patch(
  "/:id/cancel",
  schedulerController.cancelSchedule
);

/**
 * Delete a scheduled post.
 */
router.delete(
  "/:id",
  schedulerController.deleteSchedule
);

export default router;