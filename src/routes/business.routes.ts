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

/**
 * Create Business
 *
 * Accepts:
 * - Text fields through multipart/form-data
 * - Logo image through the "logo" field
 *
 * Flow:
 * FormData
 *    ↓
 * upload.single("logo")
 *    ↓
 * req.body + req.file
 *    ↓
 * validation
 *    ↓
 * createBusiness
 *    ↓
 * Cloudflare R2
 *    ↓
 * Logo URL saved to MongoDB
 */
router.post(
    "/",
    protect,
    authorize("CUSTOMER"),
    upload.single("logo"),
    createBusinessValidation,
    validate,
    createBusiness
);

/**
 * Get Business
 */
router.get(
    "/",
    protect,
    authorize("CUSTOMER"),
    getBusiness
);

/**
 * Update Business
 *
 * Accepts:
 * - Text fields through multipart/form-data
 * - Optional new logo through the "logo" field
 */
router.put(
    "/",
    protect,
    authorize("CUSTOMER"),
    upload.single("logo"),
    updateBusiness
);

/**
 * Delete Business
 */
router.delete(
    "/",
    protect,
    authorize("CUSTOMER"),
    deleteBusiness
);

export default router;