import { Router } from "express";

import {
  protect,
  authorize
} from "../middleware/auth.middleware";

import {
  generateContent,
  getHistory,
  getUsage,
  getContentById,
  deleteContent,
} from "../controllers/content.controller";

const router = Router();

router.post(
  "/generate",
  protect,
  authorize("CUSTOMER"),
  generateContent
);

router.get(
  "/history",
  protect,
  authorize("CUSTOMER"),
  getHistory
);

router.get(
  "/usage",
  protect,
  authorize("CUSTOMER"),
  getUsage
);

router.get(
  "/:id",
  protect,
  authorize("CUSTOMER"),
  getContentById
);

router.delete(
  "/:id",
  protect,
  authorize("CUSTOMER"),
  deleteContent
);

export default router;