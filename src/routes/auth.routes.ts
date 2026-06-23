import { Router } from "express";

import {
  getUsers,
  getBusinesses,
  getSubscriptions,
  deleteUserByAdmin
} from "../controllers/admin.controller";

import {
  protect,
  authorize,
} from "../middleware/auth.middleware";

const router = Router();

router.get(
  "/users",
  protect,
  authorize("CUSTOMER"),
  getUsers
);

router.get(
  "/businesses",
  protect,
  authorize("CUSTOMER"),
  getBusinesses
);

router.get(
  "/subscriptions",
  protect,
  authorize("CUSTOMER"),
  getSubscriptions
);

router.delete(
  "/users/:id",
  protect,
  authorize("CUSTOMER"),
  deleteUserByAdmin
);

export default router;