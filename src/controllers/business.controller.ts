import { Response } from "express";

import Business from "../models/Business";
import { AuthRequest } from "../middleware/auth.middleware";
import { StorageService } from "../services/images/storage.service";

// Create Business

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

        const {
            businessName,
            category,
            description,
            targetAudience,
            uniqueSellingPoint,
            brandVoice,
        } = req.body;

        if (!businessName) {
            return res.status(400).json({
                message:
                    "Business name is required",
            });
        }

        if (!category) {
            return res.status(400).json({
                message:
                    "Category is required",
            });
        }

        const business =
            await Business.create({
                owner: req.userId,

                businessName,
                category,
                description,
                targetAudience,
                uniqueSellingPoint,
                brandVoice,

                phone: req.body.phone,
                email: req.body.email,
                address: req.body.address,
                city: req.body.city,
                state: req.body.state,
                country: req.body.country,
                website: req.body.website,
                logo: req.body.logo,
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

// Get Business

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

// Update Business

export const updateBusiness = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const updates: Record<string, any> = {
            ...req.body,
        };

        /**
         * Upload logo to Cloudflare R2 if one was provided.
         * Requires upload.single("logo") middleware.
         */
        if (req.file) {
            const upload =
                await StorageService.upload(req.file);

            updates.logo = upload.url;
        }

        const business =
            await Business.findOneAndUpdate(
                {
                    owner: req.userId,
                },
                updates,
                {
                    new: true,
                    runValidators: true,
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

// Delete Business

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