import { Router } from "express";

import { protect } from "../middleware/auth.middleware";

import {
    getSubscription,
    upgradeSubscription,
    cancelSubscription,
} from "../controllers/subscription.controller";

const router = Router();

router.get(
    "/",
    protect,
    getSubscription
);

router.post(
    "/upgrade",
    protect,
    upgradeSubscription
);

router.post(
    "/cancel",
    protect,
    cancelSubscription
);

export default router;