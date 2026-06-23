import { Response } from "express";

import Business from "../models/Business";
import { AuthRequest } from "../middleware/auth.middleware";

//Create Business

export const createBusiness = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const existingBusiness =
            await Business.findOne({
                owner: req.userId,
            });

        if (existingBusiness) {
            return res.status(400).json({
                message:
                    "User already owns a business",
            });
        }

        const business =
            await Business.create({
                owner: req.userId,
                ...req.body,
            });

        return res.status(201).json({
            business,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};


//Get Business

export const getBusiness = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const business =
            await Business.findOne({
                owner: req.userId,
            });

        if (!business) {
            return res.status(404).json({
                message: "Business not found",
            });
        }

        return res.json({
            business,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

//Update Business

export const updateBusiness = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const business =
            await Business.findOneAndUpdate(
                {
                    owner: req.userId,
                },
                req.body,
                {
                    new: true,
                }
            );

        if (!business) {
            return res.status(404).json({
                message: "Business not found",
            });
        }

        return res.json({
            business,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

//Delete Business

export const deleteBusiness = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const business =
            await Business.findOneAndDelete({
                owner: req.userId,
            });

        if (!business) {
            return res.status(404).json({
                message: "Business not found",
            });
        }

        return res.json({
            message:
                "Business deleted successfully",
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};