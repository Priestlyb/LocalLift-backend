import { Response } from "express";

import Content from "../models/Content";
import Business from "../models/Business";
import Subscription from "../models/Subscription";

import { AuthRequest } from "../middleware/auth.middleware";
import { getOrCreateUsage } from "../services/usage.service";
import { PLANS } from "../constants/plans";
import { generateAIContent } from "../services/ai.service";

export const generateContent = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const {
            type,
            productName,
            details,
        } = req.body;

        const business =
            await Business.findOne({
                owner: req.userId,
            });

        if (!business) {
            return res.status(404).json({
                message: "Business not found",
            });
        }

        let subscription =
            await Subscription.findOne({
                user: req.userId,
            });

        if (!subscription) {
            subscription =
                await Subscription.create({
                    user: req.userId,
                    plan: "FREE",
                });
        }

        const usage =
            await getOrCreateUsage(
                req.userId!
            );

        const limit =
            PLANS[
                subscription.plan as keyof typeof PLANS
            ].monthlyGenerations;

        if (
            usage.generationsUsed >= limit
        ) {
            return res.status(403).json({
                message:
                    "Monthly generation limit reached",
            });
        }

        const generatedContent =
            await generateAIContent(
                type,
                business.businessName,
                business.category,
                details,
                productName
            );

        const content =
            await Content.create({
                user: req.userId,
                business: business._id,
                type,
                prompt: details,
                generatedContent,
            });

        usage.generationsUsed += 1;
        await usage.save();

        return res.json({
            content,
            remaining:
                limit -
                usage.generationsUsed,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

export const getContentById = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const content = await Content.findOne({
            _id: req.params.id,
            user: req.userId,
        });

        if (!content) {
            return res.status(404).json({
                message: "Content not found",
            });
        }

        return res.json({
            content,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

export const getHistory = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const history =
            await Content.find({
                user: req.userId,
            }).sort({
                createdAt: -1,
            });

        return res.json({
            history,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};


export const getUsage = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const subscription =
            await Subscription.findOne({
                user: req.userId,
            });

        const usage =
            await getOrCreateUsage(
                req.userId!
            );

        const plan =
            subscription?.plan || "FREE";

        const limit =
            PLANS[
                plan as keyof typeof PLANS
            ].monthlyGenerations;

        return res.json({
            plan,
            used:
                usage.generationsUsed,
            remaining:
                limit -
                usage.generationsUsed,
            limit,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

export const deleteContent = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const content = await Content.findOneAndDelete({
            _id: req.params.id,
            user: req.userId,
        });

        if (!content) {
            return res.status(404).json({
                message: "Content not found",
            });
        }

        return res.json({
            message: "Content deleted successfully",
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};