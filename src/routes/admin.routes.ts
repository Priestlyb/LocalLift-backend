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

router.get(
  "/users",
  protect,
  authorize("ADMIN"),
  getUsers
);

router.get(
  "/businesses",
  protect,
  authorize("ADMIN"),
  getBusinesses
);

router.get(
  "/subscriptions",
  protect,
  authorize("ADMIN"),
  getSubscriptions
);

router.delete(
  "/users/:id",
  protect,
  authorize("ADMIN"),
  deleteUserByAdmin
);

export default router;