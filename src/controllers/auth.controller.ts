import { Request, Response } from "express";
import bcrypt from "bcryptjs";

import User from "../models/User";
import Business from "../models/Business";
import Subscription from "../models/Subscription";
import Content from "../models/Content";
import Usage from "../models/Usage";
import { generateToken } from "../utils/jwt";

export const register = async (
    req: Request,
    res: Response
) => {
    try {
        const { name, email, password } =
            req.body;

        const existingUser =
            await User.findOne({
                email,
            });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already exists",
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "CUSTOMER",
        });

        /**
         * Every new user starts on the FREE plan.
         */
        await Subscription.create({
            user: user._id,
            plan: "FREE",
            status: "ACTIVE",
            startsAt: new Date(),
        });

        const token = generateToken(
            user._id.toString(),
            user.role
        );

        return res.status(201).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

export const login = async (
    req: Request,
    res: Response
) => {
    try {
        const { email, password } =
            req.body;

        const user = await User.findOne({
            email,
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid credentials",
            });
        }

        const isMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid credentials",
            });
        }

        const token = generateToken(
            user._id.toString(),
            user.role
        );

        return res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

export const getProfile = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = (req as any).userId;

        const user =
            await User.findById(
                userId
            ).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.json({
            user,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

export const logout = async (
    req: Request,
    res: Response
) => {
    try {
        return res.status(200).json({
            message:
                "Logged out successfully",
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

export const deleteUser = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = (req as any).userId;

        const user =
            await User.findById(
                userId
            );

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        await Promise.all([
            Subscription.deleteMany({
                user: userId,
            }),

            Business.deleteMany({
                owner: userId,
            }),

            Content.deleteMany({
                user: userId,
            }),

            Usage.deleteMany({
                user: userId,
            }),

            User.deleteMany({
                owner: userId,
            }),
        ]);

        await User.findByIdAndDelete(
            userId
        );

        return res.json({
            message:
                "User and all related data deleted successfully",
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

export const inviteStaff = async (
    req: Request,
    res: Response
) => {
    try {
        const ownerId = (req as any).userId;

        const owner =
            await User.findById(ownerId);

        if (!owner) {
            return res.status(404).json({
                message: "Owner not found",
            });
        }

        if (owner.role !== "CUSTOMER") {
            return res.status(403).json({
                message:
                    "Only business owners can create staff accounts",
            });
        }

        const { name, email, password } =
            req.body;

        if (
            !name ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                message:
                    "Name, email and password are required",
            });
        }

        const existingUser =
            await User.findOne({
                email,
            });

        if (existingUser) {
            return res.status(400).json({
                message:
                    "Email already exists",
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const staff =
            await User.create({
                name,
                email,
                password:
                    hashedPassword,
                role:
                    "CUSTOMER_STAFF",
                owner: ownerId,
            });

        return res.status(201).json({
            message:
                "Staff account created successfully",

            user: {
                id: staff._id,
                name: staff.name,
                email: staff.email,
                role: staff.role,
                owner: staff.owner,
            },
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message:
                "Server Error",
        });
    }
};