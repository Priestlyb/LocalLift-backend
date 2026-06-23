import { Request, Response, NextFunction } from "express";

const ALLOWED_PROVIDERS = [
    "KORA",
    "PAYSTACK",
];

const ALLOWED_PLANS = [
    "STARTER",
    "GROWTH",
    "PRO",
];

export const validateInitializePayment = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { provider, plan } = req.body;

    if (!provider) {
        return res.status(400).json({
            message: "Provider is required",
        });
    }

    if (!ALLOWED_PROVIDERS.includes(provider)) {
        return res.status(400).json({
            message: "Invalid provider",
        });
    }

    if (!plan) {
        return res.status(400).json({
            message: "Plan is required",
        });
    }

    if (!ALLOWED_PLANS.includes(plan)) {
        return res.status(400).json({
            message: "Invalid plan",
        });
    }

    next();
};