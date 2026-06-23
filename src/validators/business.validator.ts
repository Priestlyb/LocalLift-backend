import { body } from "express-validator";

export const createBusinessValidation = [
    body("businessName")
        .trim()
        .notEmpty()
        .withMessage("Business name is required"),

    body("category")
        .trim()
        .notEmpty()
        .withMessage("Category is required"),

    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string"),

    body("targetAudience")
        .optional()
        .isString()
        .withMessage(
            "Target audience must be a string"
        ),

    body("uniqueSellingPoint")
        .optional()
        .isString()
        .withMessage(
            "Unique selling point must be a string"
        ),

    body("brandVoice")
        .optional()
        .isString()
        .withMessage(
            "Brand voice must be a string"
        ),

    body("phone")
        .optional()
        .isString(),

    body("email")
        .optional()
        .isEmail()
        .withMessage(
            "Please provide a valid email"
        ),

    body("address")
        .optional()
        .isString(),

    body("city")
        .optional()
        .isString(),

    body("state")
        .optional()
        .isString(),

    body("country")
        .optional()
        .isString(),

    body("website")
        .optional()
        .isURL()
        .withMessage(
            "Please provide a valid website URL"
        ),

    body("logo")
        .optional()
        .isString(),
];