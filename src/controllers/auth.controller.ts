import { Request, Response } from "express";
import bcrypt from "bcryptjs";

import User from "../models/User";
import Subscription from "../models/Subscription";

import RegistrationOtp from "../models/RegistrationOtp";

import { GoogleService } from "../services/auth/google.service";
import { EmailService } from "../services/email/email.service";
import OtpService from "../services/email/otp.service";
import PasswordResetOtp from "../models/PasswordResetOtp";
import PasswordResetService from "../services/email/password-reset.service";

import { generateToken } from "../utils/jwt";

/**
 * Send registration OTP
 */
export const sendRegistrationOtp = async (
    req: Request,
    res: Response
) => {
    try {
        let {
            name,
            email,
            password,
        } = req.body;

        if (
            !name ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                message:
                    "Name, email and password are required.",
            });
        }

        // Normalize input
        name = name.trim();
        email = email
            .trim()
            .toLowerCase();

        const existingUser =
            await User.findOne({
                email,
            });

        if (existingUser) {
            return res.status(400).json({
                message:
                    "Email already exists.",
            });
        }

        const pendingRegistration =
            await RegistrationOtp.findOne({
                email,
            });

        /**
         * Prevent OTP spam.
         * Allow only one OTP every 60 seconds.
         *
         * Requires:
         * lastSentAt: Date
         * on RegistrationOtp model.
         */
        if (
            pendingRegistration?.lastSentAt &&
            Date.now() -
            pendingRegistration.lastSentAt.getTime() <
            60 * 1000
        ) {
            return res.status(429).json({
                message:
                    "Please wait 60 seconds before requesting another verification code.",
            });
        }

        const otp =
            await OtpService.createRegistrationOtp(
                name,
                email,
                password
            );

        /**
         * Send email in the background.
         */
        void EmailService.sendRegistrationOtpEmail(
            name,
            email,
            otp
        ).catch((error) => {
            console.error(
                "[SEND OTP EMAIL ERROR]",
                error
            );
        });

        return res.status(200).json({
            message:
                "Verification code has been sent to your email.",
        });
    } catch (error) {
        console.error(
            "[SEND REGISTRATION OTP ERROR]",
            error
        );

        return res.status(500).json({
            message:
                "Unable to send verification code.",
        });
    }
};

/**
 * Verify registration OTP
 */
export const verifyRegistration = async (
    req: Request,
    res: Response
) => {
    try {
        let { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message:
                    "Email and verification code are required.",
            });
        }

        // Normalize input
        email = email
            .trim()
            .toLowerCase();

        otp = otp.toString().trim();

        /**
         * Verify OTP.
         * Throws if:
         * - Registration not found
         * - OTP expired
         * - OTP invalid
         */
        const registration =
            await OtpService.verifyRegistrationOtp(
                email,
                otp
            );

        /**
         * Safety check in case another account
         * was created before verification.
         */
        const existingUser =
            await User.findOne({
                email,
            });

        if (existingUser) {
            await OtpService.deleteRegistrationOtp(
                email
            );

            return res.status(409).json({
                message:
                    "An account with this email already exists.",
            });
        }

        /**
         * Create the user.
         *
         * Password is already hashed by OtpService.
         */
        const user =
            await User.create({
                name: registration.name,
                email:
                    registration.email,
                password:
                    registration.password,
                role: "CUSTOMER",
            });

        /**
         * Every new customer starts
         * on the FREE plan.
         */
        await Subscription.create({
            user: user._id,
            plan: "FREE",
            status: "ACTIVE",
            startsAt: new Date(),
        });

        /**
         * Delete pending registration.
         */
        await OtpService.deleteRegistrationOtp(
            email
        );

        /**
         * Generate JWT.
         */
        const token =
            generateToken(
                user._id.toString(),
                user.role
            );

        /**
         * Send welcome email.
         */
        void EmailService.sendWelcomeEmail(
            user.name,
            user.email
        ).catch((error) => {
            console.error(
                "[WELCOME EMAIL ERROR]",
                error
            );
        });

        return res.status(201).json({
            message:
                "Email verified successfully.",

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },

            token,
        });
    } catch (error: any) {
        console.error(
            "[VERIFY REGISTRATION ERROR]",
            error
        );

        return res.status(400).json({
            message:
                error?.message ??
                "Verification failed.",
        });
    }
};

/**
 * Resend registration OTP
 */
export const resendRegistrationOtp = async (
    req: Request,
    res: Response
) => {
    try {
        let { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required.",
            });
        }

        email = email
            .trim()
            .toLowerCase();

        const registration =
            await RegistrationOtp.findOne({
                email,
            });

        if (!registration) {
            return res.status(404).json({
                message:
                    "Registration request not found.",
            });
        }

        if (
            registration.lastSentAt &&
            Date.now() -
            registration.lastSentAt.getTime() <
            60 * 1000
        ) {
            return res.status(429).json({
                message:
                    "Please wait 60 seconds before requesting another verification code.",
            });
        }

        if (registration.attempts >= 5) {
            return res.status(429).json({
                message:
                    "Maximum verification code requests reached. Please start registration again.",
            });
        }

        /**
         * Password stored in RegistrationOtp
         * is already hashed.
         */
        const otp =
            await OtpService.createRegistrationOtp(
                registration.name,
                registration.email,
                registration.password,
                true
            );

        void EmailService.sendRegistrationOtpEmail(
            registration.name,
            registration.email,
            otp
        ).catch((error) => {
            console.error(
                "[RESEND OTP EMAIL ERROR]",
                error
            );
        });

        return res.status(200).json({
            message:
                "Verification code resent successfully.",
        });
    } catch (error) {
        console.error(
            "[RESEND OTP ERROR]",
            error
        );

        return res.status(500).json({
            message:
                "Unable to resend verification code.",
        });
    }
};

/**
 * Login
 */
export const login = async (
    req: Request,
    res: Response
) => {
    try {
        const { email, password } =
            req.body;

        const user =
            await User.findOne({
                email,
            });

        if (!user) {
            return res.status(400).json({
                message:
                    "Invalid credentials",
            });
        }

        if (!user.password) {
            return res.status(400).json({
                message:
                    "This account uses Google or Apple Sign-In. Please continue with your social account.",
            });
        }

        const isMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isMatch) {
            return res.status(400).json({
                message:
                    "Invalid credentials",
            });
        }

        const token =
            generateToken(
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
        console.error(
            "[LOGIN ERROR]",
            error
        );

        return res.status(500).json({
            message:
                "Server Error",
        });
    }
};

import Business from "../models/Business";
import Content from "../models/Content";
import Usage from "../models/Usage";

/**
 * Get authenticated user's profile
 */
export const getProfile = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = (req as any).userId;

        const user = await User.findById(
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
        console.error(
            "[GET PROFILE ERROR]",
            error
        );

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

/**
 * Logout
 *
 * Since authentication is JWT-based, the client
 * simply discards the token.
 */
export const logout = async (
    req: Request,
    res: Response
) => {
    try {
        return res.status(200).json({
            message: "Logged out successfully",
        });
    } catch (error) {
        console.error(
            "[LOGOUT ERROR]",
            error
        );

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

/**
 * Delete authenticated user
 */
export const deleteUser = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = (req as any).userId;

        const user = await User.findById(
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
        console.error(
            "[DELETE USER ERROR]",
            error
        );

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

/**
 * Invite staff member
 */
export const inviteStaff = async (
    req: Request,
    res: Response
) => {
    try {
        const ownerId = (req as any).userId;

        const owner = await User.findById(
            ownerId
        );

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

        const {
            name,
            email,
            password,
        } = req.body;

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
            await bcrypt.hash(
                password,
                10
            );

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
        console.error(
            "[INVITE STAFF ERROR]",
            error
        );

        return res.status(500).json({
            message: "Server Error",
        });
    }
};


/**
 * Google Login / Sign Up
 */
export const googleLogin = async (
    req: Request,
    res: Response
) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                message:
                    "Google ID token is required.",
            });
        }

        const googleUser =
            await GoogleService.verifyIdToken(
                idToken
            );

        if (!googleUser.emailVerified) {
            return res.status(400).json({
                message:
                    "Google email address has not been verified.",
            });
        }

        const email =
            googleUser.email
                .trim()
                .toLowerCase();

        let user =
            await User.findOne({
                email,
            });

        /**
         * First-time Google login.
         * Create LocalLift account.
         */
        if (!user) {
            /**
             * Google users don't have a password.
             * Store a random hash so the field
             * remains valid.
             */
            const randomPassword =
                await bcrypt.hash(
                    crypto.randomUUID(),
                    10
                );

            user =
                await User.create({
                    name:
                        googleUser.name ||
                        "Google User",
                    email,
                    password:
                        randomPassword,
                    role: "CUSTOMER",
                });

            await Subscription.create({
                user: user._id,
                plan: "FREE",
                status: "ACTIVE",
                startsAt: new Date(),
            });

            /**
             * Send welcome email.
             */
            void EmailService.sendWelcomeEmail(
                user.name,
                user.email
            ).catch((error) => {
                console.error(
                    "[WELCOME EMAIL ERROR]",
                    error
                );
            });
        }

        const token =
            generateToken(
                user._id.toString(),
                user.role
            );

        return res.status(200).json({
            message:
                "Google login successful.",

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },

            token,
        });
    } catch (error: any) {
        console.error(
            "[GOOGLE LOGIN ERROR]",
            error
        );

        return res.status(401).json({
            message:
                error?.message ??
                "Google authentication failed.",
        });
    }
};

/**
 * Forgot Password
 */
export const forgotPassword = async (
    req: Request,
    res: Response
) => {
    try {
        let { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required.",
            });
        }

        email = email.trim().toLowerCase();

        const user = await User.findOne({
            email,
        });

        /**
         * Never reveal whether
         * the email exists.
         */
        if (!user) {
            return res.status(200).json({
                message:
                    "If an account exists, a password reset code has been sent.",
            });
        }

        const existing =
            await PasswordResetOtp.findOne({
                email,
            });

        if (
            existing?.lastSentAt &&
            Date.now() -
            existing.lastSentAt.getTime() <
            60 * 1000
        ) {
            return res.status(429).json({
                message:
                    "Please wait 60 seconds before requesting another code.",
            });
        }

        const otp =
            await PasswordResetService.createOtp(
                email
            );

        void EmailService.sendPasswordResetOtpEmail(
            user.name,
            email,
            otp
        ).catch(console.error);

        return res.status(200).json({
            message:
                "If an account exists, a password reset code has been sent.",
        });
    } catch (error) {
        console.error(
            "[FORGOT PASSWORD ERROR]",
            error
        );

        return res.status(500).json({
            message: "Server Error",
        });
    }
};

/**
 * Verify Password Reset OTP
 */
export const verifyResetOtp = async (
    req: Request,
    res: Response
) => {
    try {
        let { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message:
                    "Email and verification code are required.",
            });
        }

        email = email.trim().toLowerCase();

        await PasswordResetService.verifyOtp(
            email,
            otp
        );

        return res.status(200).json({
            message:
                "Verification successful.",
        });
    } catch (error: any) {
        return res.status(400).json({
            message:
                error.message ??
                "Verification failed.",
        });
    }
};

/**
 * Reset Password
 */
export const resetPassword = async (
    req: Request,
    res: Response
) => {
    try {
        let {
            email,
            otp,
            newPassword,
        } = req.body;

        if (
            !email ||
            !otp ||
            !newPassword
        ) {
            return res.status(400).json({
                message:
                    "Email, verification code and new password are required.",
            });
        }

        email = email.trim().toLowerCase();

        await PasswordResetService.verifyOtp(
            email,
            otp
        );

        const user =
            await User.findOne({
                email,
            });

        if (!user) {
            return res.status(404).json({
                message:
                    "User not found.",
            });
        }

        user.password =
            await bcrypt.hash(
                newPassword,
                10
            );

        await user.save();

        await PasswordResetService.deleteOtp(
            email
        );

        void EmailService.sendPasswordChangedEmail(
            user.name,
            user.email
        ).catch(console.error);

        return res.status(200).json({
            message:
                "Password reset successfully.",
        });
    } catch (error: any) {
        return res.status(400).json({
            message:
                error.message ??
                "Password reset failed.",
        });
    }
};
