import { Router } from "express";
import {
  register,
  login,
  getProfile,
  deleteUser,
  logout,
} from "../controllers/auth.controller";

import { protect } from "../middleware/auth.middleware";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.post(
  "/logout",
  protect,
  logout
);
router.get("/profile", protect, getProfile);
router.delete("/delete", protect, deleteUser);

export default router;