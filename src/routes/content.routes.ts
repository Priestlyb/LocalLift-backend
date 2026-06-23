import { Router } from "express";

import { protect } from "../middleware/auth.middleware";

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
  generateContent
);

router.get(
  "/history",
  protect,
  getHistory
);

router.get(
  "/usage",
  protect,
  getUsage
);

router.get(
  "/:id",
  protect,
  getContentById
);

router.delete(
  "/:id",
  protect,
  deleteContent
);

export default router;