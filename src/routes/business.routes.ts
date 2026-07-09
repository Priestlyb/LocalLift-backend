import { Router } from "express";

import {
    createBusiness,
    getBusiness,
    updateBusiness,
    deleteBusiness,
} from "../controllers/business.controller";

import {
    protect,
    authorize,
} from "../middleware/auth.middleware";

import {
    createBusinessValidation,
} from "../validators/business.validator";

import { validate } from "../middleware/validation.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

router.post(
    "/",
    protect,
    authorize("CUSTOMER"),
    createBusinessValidation,
    validate,
    createBusiness
);

router.get(
    "/",
    protect,
    authorize("CUSTOMER"),
    getBusiness
);

router.put(
    "/",
    protect,
    authorize("CUSTOMER"),
    upload.single("logo"),
    updateBusiness
);

router.delete(
    "/",
    protect,
    authorize("CUSTOMER"),
    deleteBusiness
);

export default router;