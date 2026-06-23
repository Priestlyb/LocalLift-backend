import { Router } from "express";

import {
    protect,
    authorize
} from "../middleware/auth.middleware";

import {
    getSubscription,
    upgradeSubscription,
    cancelSubscription,
} from "../controllers/subscription.controller";

const router = Router();

router.get(
    "/",
    protect,
    authorize("CUSTOMER"),
    getSubscription
);

router.post(
    "/upgrade",
    protect,
    authorize("CUSTOMER"),
    upgradeSubscription
);

router.post(
    "/cancel",
    protect,
    authorize("CUSTOMER"),
    cancelSubscription
);

export default router;