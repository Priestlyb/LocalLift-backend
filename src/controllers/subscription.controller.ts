import { Response } from "express";

import Subscription from "../models/Subscription";
import { AuthRequest } from "../middleware/auth.middleware";
import { PLANS } from "../constants/plans";


export const getSubscription = async (
    req: AuthRequest,
    res: Response
) => {
    try {
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

        return res.json({
            subscription,
            limits:
                PLANS[
                subscription.plan as keyof typeof PLANS
                ],
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};


export const upgradeSubscription = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const { plan } = req.body;

        if (
            !["FREE", "STARTER", "GROWTH", "PRO"].includes(
                plan
            )
        ) {
            return res.status(400).json({
                message: "Invalid plan",
            });
        }

        const expiresAt = new Date();

        expiresAt.setMonth(
            expiresAt.getMonth() + 1
        );

        const subscription =
            await Subscription.findOneAndUpdate(
                {
                    user: req.userId,
                },
                {
                    plan,
                    status: "ACTIVE",
                    startsAt: new Date(),
                    expiresAt,
                },
                {
                    upsert: true,
                    new: true,
                }
            );

        return res.json({
            message:
                "Subscription updated successfully",
            subscription,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};


export const cancelSubscription = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const subscription =
            await Subscription.findOneAndUpdate(
                {
                    user: req.userId,
                },
                {
                    status: "CANCELLED",
                },
                {
                    new: true,
                }
            );

        return res.json({
            message:
                "Subscription cancelled",
            subscription,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

