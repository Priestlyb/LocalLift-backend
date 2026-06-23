import { Router } from "express";

import {
  protect,
  authorize
} from "../middleware/auth.middleware";

import {
  getDashboardAnalytics,
} from "../controllers/analytics.controller";

const router = Router();

router.get(
  "/dashboard",
  protect,
  authorize("CUSTOMER"),
  getDashboardAnalytics
);

export default router;