import { body } from "express-validator";

export const createBusinessValidation = [
    body("businessName")
        .notEmpty()
        .withMessage("Business name is required"),

    body("category")
        .notEmpty()
        .withMessage("Category is required"),
];