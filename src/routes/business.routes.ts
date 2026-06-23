import { Router } from "express";

import {
    createBusiness,
    getBusiness,
    updateBusiness,
    deleteBusiness,
} from "../controllers/business.controller";

import { protect } from "../middleware/auth.middleware";

import {
    createBusinessValidation,
} from "../validators/business.validator";

import { validate } from "../middleware/validation.middleware";

const router = Router();

router.post(
    "/",
    protect,
    createBusinessValidation,
    validate,
    createBusiness
);

router.get(
    "/",
    protect,
    getBusiness
);

router.put(
    "/",
    protect,
    updateBusiness
);

router.delete(
    "/",
    protect,
    deleteBusiness
);

export default router;
