import { Response } from "express";
import bcrypt from "bcryptjs";

import Business from "../models/Business";
import User from "../models/User";
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

            address,
            city,
            state,
            country,

            phone,
            email,
            website,

            facebook,
            instagram,
            linkedin,
            tiktok,
            x,

            targetAudience,
            brandVoice,
            uniqueSellingPoint,

            primaryColor,
            secondaryColor,
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

        /**
         * Upload logo to Cloudflare R2
         * if a logo file was provided.
         */
        let logo = "";

        if (req.file) {
            const upload =
                await StorageService.upload(req.file);

            logo = upload.url;
        }

        const business =
            await Business.create({
                owner: req.userId,

                businessName,
                category,
                description,

                address,
                city,
                state,
                country,

                phone,
                email,
                website,

                facebook,
                instagram,
                linkedin,
                tiktok,
                x,

                targetAudience,
                brandVoice,
                uniqueSellingPoint,

                primaryColor,
                secondaryColor,

                logo,
            });

        return res.status(201).json({
            business,
        });
    } catch (error) {
        console.error(
            "Error creating business:",
            error
        );

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
        const {
            password,
            ...businessUpdates
        } = req.body;

        /**
         * Require the user's actual password
         * before allowing business settings
         * to be changed.
         */
        if (!password) {
            return res.status(400).json({
                success: false,
                message:
                    "Password is required to update business settings.",
            });
        }

        /**
         * Find the authenticated user.
         */
        const user = await User.findById(
            req.userId
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        /**
         * Make sure this account has
         * a password available.
         */
        if (!user.password) {
            return res.status(400).json({
                success: false,
                message:
                    "Password verification is not available for this account.",
            });
        }

        /**
         * Compare the actual password entered
         * by the user against the hashed password
         * stored in MongoDB.
         */
        const passwordMatches =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message:
                    "Password is incorrect.",
            });
        }

        /**
         * Password is correct.
         *
         * Only business fields remain here.
         * The password has already been removed
         * from the object above.
         */
        const updates: Record<string, any> = {
            ...businessUpdates,
        };

        /**
         * Upload logo to Cloudflare R2
         * if a new logo was provided.
         */
        if (req.file) {
            const upload =
                await StorageService.upload(
                    req.file
                );

            updates.logo = upload.url;
        }

        /**
         * Update the business belonging
         * to the authenticated user.
         */
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
                success: false,
                message:
                    "Business not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message:
                "Business updated successfully.",
            business,
        });
    } catch (error) {
        console.error(
            "[UPDATE BUSINESS ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
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
            message:
                "Business deleted successfully",
        });
    }
};