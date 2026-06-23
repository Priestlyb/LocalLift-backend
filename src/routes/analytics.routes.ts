import { Router } from "express";

import { protect } from "../middleware/auth.middleware";

import {
  getDashboardAnalytics,
} from "../controllers/analytics.controller";

const router = Router();

router.get(
  "/dashboard",
  protect,
  getDashboardAnalytics
);

export default router;