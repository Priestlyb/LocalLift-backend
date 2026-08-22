import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import User from "../models/User";
import Subscription from "../models/Subscription";
import RegistrationOtp from "../models/RegistrationOtp";
import StaffInvitation from "../models/StaffInvitation";
import PasswordResetOtp from "../models/PasswordResetOtp";

import Business from "../models/Business";
import Content from "../models/Content";
import Usage from "../models/Usage";

import { GoogleService } from "../services/auth/google.service";
import { EmailService } from "../services/email/email.service";
import OtpService from "../services/email/otp.service";
import PasswordResetService from "../services/email/password-reset.service";

import { generateToken } from "../utils/jwt";

/**
 * ==========================================
 * SECURITY CONSTANTS
 * ==========================================
 */

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

const NAME_MAX_LENGTH = 100;

const EMAIL_MAX_LENGTH = 254;

const STAFF_INVITATION_EXPIRY_MS =
    24 * 60 * 60 * 1000;

/**
 * ==========================================
 * HELPERS
 * ==========================================
 */

/**
 * Normalize email addresses consistently.
 */
const normalizeEmail = (
    value: unknown
): string | null => {
    if (typeof value !== "string") {
        return null;
    }

    const email = value
        .trim()
        .toLowerCase();

    if (!email || email.length > EMAIL_MAX_LENGTH) {
        return null;
    }

    return email;
};

/**
 * Validate a display name.
 */
const validateName = (
    value: unknown
): string | null => {
    if (typeof value !== "string") {
        return null;
    }

    const name = value.trim();

    if (
        !name ||
        name.length > NAME_MAX_LENGTH
    ) {
        return null;
    }

    return name;
};

/**
 * Validate password.
 *
 * We intentionally do not require complicated
 * character rules. Length is more important and
 * allows users to use strong passphrases.
 */
const isValidPassword = (
    password: unknown
): password is string => {
    if (typeof password !== "string") {
        return false;
    }

    return (
        password.length >= PASSWORD_MIN_LENGTH &&
        password.length <= PASSWORD_MAX_LENGTH
    );
};

/**
 * Generic authentication error.
 *
 * Do not expose whether an email exists or
 * which part of authentication failed.
 */
const INVALID_CREDENTIALS_MESSAGE =
    "Invalid credentials.";

/**
 * ==========================================
 * SEND REGISTRATION OTP
 * ==========================================
 */

export const sendRegistrationOtp = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            name: rawName,
            email: rawEmail,
            password,
        } = req.body ?? {};

        const name = validateName(rawName);
        const email = normalizeEmail(rawEmail);

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message:
                    "A valid name and email are required.",
            });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                message:
                    `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
            });
        }

        /**
         * Check whether the email is already registered.
         */
        const existingUser =
            await User.findOne({
                email,
            }).select("_id");

        if (existingUser) {
            /**
             * Do not reveal unnecessary account
             * information in production.
             */
            return res.status(200).json({
                success: true,
                message:
                    "If the email is available, a verification code has been sent.",
            });
        }

        const pendingRegistration =
            await RegistrationOtp.findOne({
                email,
            });

        /**
         * Prevent OTP spam.
         *
         * Rate limiting middleware should also
         * protect this endpoint.
         */
        if (
            pendingRegistration?.lastSentAt &&
            Date.now() -
            pendingRegistration.lastSentAt.getTime() <
            60 * 1000
        ) {
            return res.status(429).json({
                success: false,
                message:
                    "Please wait before requesting another verification code.",
            });
        }

        const otp =
            await OtpService.createRegistrationOtp(
                name,
                email,
                password
            );

        /**
         * Email failures are logged server-side
         * but are not exposed to the client.
         */
        void EmailService
            .sendRegistrationOtpEmail(
                name,
                email,
                otp
            )
            .catch((error) => {
                console.error(
                    "[SEND REGISTRATION OTP EMAIL ERROR]",
                    error
                );
            });

        return res.status(200).json({
            success: true,
            message:
                "If the email is available, a verification code has been sent.",
        });
    } catch (error) {
        console.error(
            "[SEND REGISTRATION OTP ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to process registration request.",
        });
    }
};

/**
 * ==========================================
 * VERIFY REGISTRATION
 * ==========================================
 */

export const verifyRegistration = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            email: rawEmail,
            otp: rawOtp,
        } = req.body ?? {};

        const email = normalizeEmail(rawEmail);

        if (
            !email ||
            (typeof rawOtp !== "string" &&
                typeof rawOtp !== "number")
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and verification code are required.",
            });
        }

        const otp = String(rawOtp).trim();

        /**
         * OTP should be numeric and exactly 6 digits.
         */
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid verification code.",
            });
        }

        const registration =
            await OtpService.verifyRegistrationOtp(
                email,
                otp
            );

        /**
         * Race-condition protection.
         *
         * The unique email index on User is still
         * the final protection against duplicate users.
         */
        const existingUser =
            await User.findOne({
                email,
            }).select("_id");

        if (existingUser) {
            await OtpService.deleteRegistrationOtp(
                email
            );

            return res.status(409).json({
                success: false,
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
                email: registration.email,
                password: registration.password,
                provider: "local",
                role: "CUSTOMER",
                owner: null,
            });

        /**
         * Create default subscription.
         */
        await Subscription.create({
            user: user._id,
            plan: "FREE",
            status: "ACTIVE",
            startsAt: new Date(),
        });

        /**
         * Remove OTP immediately after successful
         * account creation.
         */
        await OtpService.deleteRegistrationOtp(
            email
        );

        const token = generateToken(
            user._id.toString(),
            user.role
        );

        void EmailService
            .sendWelcomeEmail(
                user.name,
                user.email
            )
            .catch((error) => {
                console.error(
                    "[WELCOME EMAIL ERROR]",
                    error
                );
            });

        return res.status(201).json({
            success: true,
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
    } catch (error) {
        console.error(
            "[VERIFY REGISTRATION ERROR]",
            error
        );

        /**
         * Do not return error.message.
         * It can expose implementation details.
         */
        return res.status(400).json({
            success: false,
            message:
                "Verification failed.",
        });
    }
};

/**
 * ==========================================
 * RESEND REGISTRATION OTP
 * ==========================================
 */

export const resendRegistrationOtp = async (
    req: Request,
    res: Response
) => {
    try {
        const email =
            normalizeEmail(
                req.body?.email
            );

        if (!email) {
            return res.status(400).json({
                success: false,
                message:
                    "A valid email is required.",
            });
        }

        const registration =
            await RegistrationOtp.findOne({
                email,
            });

        if (!registration) {
            /**
             * Generic response prevents account/
             * registration enumeration.
             */
            return res.status(200).json({
                success: true,
                message:
                    "If a pending registration exists, a verification code has been sent.",
            });
        }

        if (
            registration.lastSentAt &&
            Date.now() -
            registration.lastSentAt.getTime() <
            60 * 1000
        ) {
            return res.status(429).json({
                success: false,
                message:
                    "Please wait before requesting another verification code.",
            });
        }

        /**
         * Maximum OTP generations for one
         * registration.
         */
        if (registration.attempts >= 5) {
            await OtpService.deleteRegistrationOtp(
                email
            );

            return res.status(429).json({
                success: false,
                message:
                    "Too many verification code requests. Please start registration again.",
            });
        }

        const otp =
            await OtpService.createRegistrationOtp(
                registration.name,
                registration.email,
                registration.password,
                true
            );

        void EmailService
            .sendRegistrationOtpEmail(
                registration.name,
                registration.email,
                otp
            )
            .catch((error) => {
                console.error(
                    "[RESEND REGISTRATION OTP EMAIL ERROR]",
                    error
                );
            });

        return res.status(200).json({
            success: true,
            message:
                "Verification code resent successfully.",
        });
    } catch (error) {
        console.error(
            "[RESEND REGISTRATION OTP ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to process verification request.",
        });
    }
};

/**
 * ==========================================
 * LOGIN
 * ==========================================
 */

export const login = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            email: rawEmail,
            password,
        } = req.body ?? {};

        const email =
            normalizeEmail(rawEmail);

        if (
            !email ||
            typeof password !== "string" ||
            password.length === 0
        ) {
            return res.status(401).json({
                success: false,
                message:
                    INVALID_CREDENTIALS_MESSAGE,
            });
        }

        /**
         * Explicitly select password in case the
         * schema is later changed to select:false.
         */
        const user =
            await User.findOne({
                email,
            }).select(
                "+password +provider +role"
            );

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    INVALID_CREDENTIALS_MESSAGE,
            });
        }

        /**
         * Social accounts should not authenticate
         * through the password endpoint.
         */
        if (
            user.provider !== "local" ||
            !user.password
        ) {
            return res.status(401).json({
                success: false,
                message:
                    INVALID_CREDENTIALS_MESSAGE,
            });
        }

        const isMatch =
            await user.comparePassword(
                password
            );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message:
                    INVALID_CREDENTIALS_MESSAGE,
            });
        }

        const token = generateToken(
            user._id.toString(),
            user.role
        );

        return res.status(200).json({
            success: true,
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
            success: false,
            message:
                "Unable to process login.",
        });
    }
};

/**
 * ==========================================
 * GET PROFILE
 * ==========================================
 */

export const getProfile = async (
    req: Request,
    res: Response
) => {
    try {
        const userId =
            (req as any).userId;

        const user =
            await User.findById(
                userId
            ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "User not found.",
            });
        }

        return res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        console.error(
            "[GET PROFILE ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to retrieve profile.",
        });
    }
};

/**
 * ==========================================
 * UPDATE PROFILE
 * ==========================================
 */

export const updateProfile = async (
    req: Request,
    res: Response
) => {
    try {
        const userId =
            (req as any).userId;

        const {
            name,
            email,
            currentPassword,
        } = req.body ?? {};

        if (
            typeof currentPassword !== "string" ||
            !currentPassword
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Current password is required.",
            });
        }

        const user =
            await User.findById(userId)
                .select(
                    "+password +provider"
                );

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "User not found.",
            });
        }

        if (
            user.provider !== "local" ||
            !user.password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Password verification is not available for this account.",
            });
        }

        const passwordMatches =
            await user.comparePassword(
                currentPassword
            );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message:
                    "Current password is incorrect.",
            });
        }

        if (
            name === undefined &&
            email === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "No profile changes were provided.",
            });
        }

        /**
         * Name update.
         */
        if (name !== undefined) {
            const normalizedName =
                validateName(name);

            if (!normalizedName) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid name.",
                });
            }

            user.name =
                normalizedName;
        }

        /**
         * Email update.
         *
         * IMPORTANT:
         * In a true production implementation,
         * changing email should trigger email
         * verification rather than immediately
         * changing the account email.
         *
         * We leave the actual verification flow
         * for the email-change service.
         */
        if (email !== undefined) {
            const normalizedEmail =
                normalizeEmail(email);

            if (!normalizedEmail) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid email address.",
                });
            }

            if (
                normalizedEmail !== user.email
            ) {
                const existingUser =
                    await User.findOne({
                        email:
                            normalizedEmail,
                        _id: {
                            $ne: userId,
                        },
                    }).select("_id");

                if (existingUser) {
                    return res.status(409).json({
                        success: false,
                        message:
                            "Email is already in use.",
                    });
                }

                /**
                 * For now we update it.
                 *
                 * Recommended next step:
                 * create email-change OTP and only
                 * commit this change after verification.
                 */
                user.email =
                    normalizedEmail;
            }
        }

        await user.save();

        const updatedUser =
            await User.findById(
                userId
            ).select("-password");

        return res.status(200).json({
            success: true,
            message:
                "Profile updated successfully.",
            user: updatedUser,
        });
    } catch (error) {
        console.error(
            "[UPDATE PROFILE ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update profile.",
        });
    }
};

/**
 * ==========================================
 * LOGOUT
 * ==========================================
 *
 * With stateless JWTs, the server cannot truly
 * revoke the token unless we introduce token
 * versioning/session storage.
 *
 * The client should discard the token.
 */

export const logout = async (
    req: Request,
    res: Response
) => {
    return res.status(200).json({
        success: true,
        message:
            "Logged out successfully.",
    });
};

/**
 * ==========================================
 * DELETE USER
 * ==========================================
 */

export const deleteUser = async (
    req: Request,
    res: Response
) => {
    try {
        const userId =
            (req as any).userId;

        const user =
            await User.findById(userId)
                .select("_id");

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "User not found.",
            });
        }

        /**
         * Delete related data.
         *
         * Ideally this should eventually be
         * handled with a transaction.
         */
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

        return res.status(200).json({
            success: true,
            message:
                "User and associated data deleted successfully.",
        });
    } catch (error) {
        console.error(
            "[DELETE USER ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete account.",
        });
    }
};

/**
 * ==========================================
 * INVITE STAFF
 * ==========================================
 */

export const inviteStaff = async (
    req: Request,
    res: Response
) => {
    try {
        const ownerId =
            (req as any).userId;

        const owner =
            await User.findById(
                ownerId
            ).select(
                "_id name role"
            );

        if (!owner) {
            return res.status(404).json({
                success: false,
                message:
                    "Owner not found.",
            });
        }

        if (owner.role !== "CUSTOMER") {
            return res.status(403).json({
                success: false,
                message:
                    "Only business owners can invite staff members.",
            });
        }

        const {
            name: rawName,
            email: rawEmail,
        } = req.body ?? {};

        const name =
            validateName(rawName);

        const email =
            normalizeEmail(rawEmail);

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message:
                    "A valid name and email are required.",
            });
        }

        const existingUser =
            await User.findOne({
                email,
            }).select("_id");

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message:
                    "An account with this email already exists.",
            });
        }

        const existingInvitation =
            await StaffInvitation.findOne({
                email,
                owner: ownerId,
                acceptedAt: null,
            }).select("_id");

        if (existingInvitation) {
            return res.status(400).json({
                success: false,
                message:
                    "A pending invitation already exists for this email.",
            });
        }

        /**
         * Generate a high-entropy invitation
         * secret.
         *
         * IMPORTANT:
         * The StaffInvitation model should store
         * a hash of this token rather than the raw
         * token. We will update that model next.
         */
        const invitationToken =
            crypto.randomBytes(32)
                .toString("hex");

        const expiresAt =
            new Date(
                Date.now() +
                STAFF_INVITATION_EXPIRY_MS
            );

        const invitation =
            await StaffInvitation.create({
                name,
                email,
                owner: ownerId,

                /**
                 * Temporary compatibility:
                 *
                 * This should become tokenHash
                 * after updating StaffInvitation.ts.
                 */
                token: invitationToken,

                expiresAt,
            });

        const clientUrl =
            process.env.CLIENT_URL;

        if (!clientUrl) {
            console.error(
                "[INVITE STAFF] CLIENT_URL is not configured."
            );

            /**
             * Remove the invitation because
             * we cannot construct a safe link.
             */
            await StaffInvitation.deleteOne({
                _id: invitation._id,
            });

            return res.status(500).json({
                success: false,
                message:
                    "Unable to create staff invitation.",
            });
        }

        const invitationUrl =
            `${clientUrl}/staff/accept-invitation?token=${encodeURIComponent(
                invitationToken
            )}`;

        void EmailService
            .sendStaffInvitationEmail(
                invitation.name,
                invitation.email,
                owner.name,
                invitationUrl
            )
            .catch((error) => {
                console.error(
                    "[STAFF INVITATION EMAIL ERROR]",
                    error
                );
            });

        return res.status(201).json({
            success: true,
            message:
                "Staff invitation sent successfully.",
            invitation: {
                id: invitation._id,
                name: invitation.name,
                email: invitation.email,
                expiresAt:
                    invitation.expiresAt,
            },
        });
    } catch (error) {
        console.error(
            "[INVITE STAFF ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to send staff invitation.",
        });
    }
};

/**
 * ==========================================
 * ACCEPT STAFF INVITATION
 * ==========================================
 */

export const acceptStaffInvitation =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const {
                token: rawToken,
                password,
            } = req.body ?? {};

            if (
                typeof rawToken !== "string" ||
                !rawToken.trim() ||
                typeof password !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invitation token and password are required.",
                });
            }

            const token =
                rawToken.trim();

            /**
             * Invitation tokens generated by
             * randomBytes(32).toString("hex")
             * are exactly 64 hex characters.
             */
            if (
                !/^[a-f0-9]{64}$/i.test(
                    token
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid invitation.",
                });
            }

            if (
                !isValidPassword(password)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
                });
            }

            const invitation =
                await StaffInvitation.findOne({
                    token,
                    acceptedAt: null,
                });

            if (!invitation) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid or expired invitation.",
                });
            }

            if (
                invitation.expiresAt.getTime() <=
                Date.now()
            ) {
                await StaffInvitation.deleteOne({
                    _id: invitation._id,
                });

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid or expired invitation.",
                });
            }

            const existingUser =
                await User.findOne({
                    email:
                        invitation.email,
                }).select("_id");

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message:
                        "An account with this email already exists.",
                });
            }

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    12
                );

            /**
             * Create staff account.
             *
             * The unique email index remains the
             * final race-condition protection.
             */
            const staff =
                await User.create({
                    name:
                        invitation.name,

                    email:
                        invitation.email,

                    password:
                        hashedPassword,

                    provider:
                        "local",

                    role:
                        "CUSTOMER_STAFF",

                    owner:
                        invitation.owner,
                });

            /**
             * Consume invitation.
             */
            invitation.acceptedAt =
                new Date();

            await invitation.save();

            const authToken =
                generateToken(
                    staff._id.toString(),
                    staff.role
                );

            return res.status(201).json({
                success: true,
                message:
                    "Invitation accepted successfully.",
                user: {
                    id: staff._id,
                    name: staff.name,
                    email: staff.email,
                    role: staff.role,
                    owner: staff.owner,
                },
                token: authToken,
            });
        } catch (error: any) {
            /**
             * Duplicate email race.
             */
            if (
                error?.code === 11000
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Unable to create this account. The email may already be registered.",
                });
            }

            console.error(
                "[ACCEPT STAFF INVITATION ERROR]",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to accept invitation.",
            });
        }
    };

/**
 * ==========================================
 * GOOGLE LOGIN
 * ==========================================
 */

export const googleLogin = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            idToken,
        } = req.body ?? {};

        if (
            typeof idToken !== "string" ||
            !idToken.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Google authentication token is required.",
            });
        }

        const googleUser =
            await GoogleService.verifyIdToken(
                idToken
            );

        if (
            !googleUser.emailVerified
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Google authentication failed.",
            });
        }

        const email =
            normalizeEmail(
                googleUser.email
            );

        if (!email) {
            return res.status(401).json({
                success: false,
                message:
                    "Google authentication failed.",
            });
        }

        let user =
            await User.findOne({
                email,
            }).select(
                "+provider +googleId"
            );

        /**
         * Existing account.
         */
        if (user) {
            /**
             * If this email belongs to a local
             * account, do NOT automatically link
             * Google to it.
             *
             * Explicit account-linking should be
             * implemented separately and require
             * proof of ownership.
             */
            if (
                user.provider === "local"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "An account already exists with this email. Please sign in using your existing login method.",
                });
            }

            /**
             * Existing Google account.
             */
            if (
                user.provider !== "google"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Please use the authentication method originally used for this account.",
                });
            }

            /**
             * Verify that the Google subject
             * belongs to this account.
             *
             * Depending on GoogleService, you may
             * need to expose `sub` here.
             */
            if (
                user.googleId &&
                user.googleId !==
                googleUser.googleId
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Google authentication failed.",
                });
            }

            if (!user.googleId) {
                user.googleId =
                    googleUser.googleId;

                await user.save();
            }
        } else {
            /**
             * First-time Google account.
             *
             * Do NOT create a fake password.
             */
            user =
                await User.create({
                    name:
                        googleUser.name ||
                        "Google User",

                    email,

                    password:
                        undefined,

                    provider:
                        "google",

                    googleId:
                        googleUser.googleId,

                    role:
                        "CUSTOMER",

                    owner:
                        null,
                });

            await Subscription.create({
                user: user._id,
                plan: "FREE",
                status: "ACTIVE",
                startsAt: new Date(),
            });

            void EmailService
                .sendWelcomeEmail(
                    user.name,
                    user.email
                )
                .catch((error) => {
                    console.error(
                        "[GOOGLE WELCOME EMAIL ERROR]",
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
            success: true,
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
    } catch (error) {
        console.error(
            "[GOOGLE LOGIN ERROR]",
            error
        );

        return res.status(401).json({
            success: false,
            message:
                "Google authentication failed.",
        });
    }
};

/**
 * ==========================================
 * FORGOT PASSWORD
 * ==========================================
 */

export const forgotPassword = async (
    req: Request,
    res: Response
) => {
    try {
        const email =
            normalizeEmail(
                req.body?.email
            );

        if (!email) {
            return res.status(400).json({
                success: false,
                message:
                    "A valid email is required.",
            });
        }

        const genericResponse = {
            success: true,
            message:
                "If an account exists, a password reset code has been sent.",
        };

        const user =
            await User.findOne({
                email,
            }).select(
                "_id name email provider"
            );

        /**
         * Always return the same response for
         * unknown accounts.
         */
        if (!user) {
            return res.status(200).json(
                genericResponse
            );
        }

        /**
         * Social accounts cannot reset a local
         * password they don't have.
         */
        if (
            user.provider !== "local"
        ) {
            return res.status(200).json(
                genericResponse
            );
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
            /**
             * Still return a generic response.
             */
            return res.status(200).json(
                genericResponse
            );
        }

        /**
         * Limit the lifetime of a reset request.
         *
         * The service also tracks verification
         * attempts.
         */
        if (
            existing &&
            existing.attempts >= 5
        ) {
            await PasswordResetOtp.deleteOne({
                email,
            });

            return res.status(200).json(
                genericResponse
            );
        }

        const otp =
            await PasswordResetService.createOtp(
                email
            );

        void EmailService
            .sendPasswordResetOtpEmail(
                user.name,
                email,
                otp
            )
            .catch((error) => {
                console.error(
                    "[PASSWORD RESET EMAIL ERROR]",
                    error
                );
            });

        return res.status(200).json(
            genericResponse
        );
    } catch (error) {
        console.error(
            "[FORGOT PASSWORD ERROR]",
            error
        );

        /**
         * Avoid revealing whether the
         * account exists.
         */
        return res.status(200).json({
            success: true,
            message:
                "If an account exists, a password reset code has been sent.",
        });
    }
};

/**
 * ==========================================
 * VERIFY PASSWORD RESET OTP
 * ==========================================
 */

export const verifyResetOtp = async (
    req: Request,
    res: Response
) => {
    try {
        const email =
            normalizeEmail(
                req.body?.email
            );

        const rawOtp =
            req.body?.otp;

        if (
            !email ||
            (typeof rawOtp !== "string" &&
                typeof rawOtp !== "number")
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid verification request.",
            });
        }

        const otp =
            String(rawOtp).trim();

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid verification code.",
            });
        }

        await PasswordResetService.verifyOtp(
            email,
            otp
        );

        return res.status(200).json({
            success: true,
            message:
                "Verification successful.",
        });
    } catch (error) {
        /**
         * Do not expose service errors.
         */
        return res.status(400).json({
            success: false,
            message:
                "Invalid or expired verification code.",
        });
    }
};

/**
 * ==========================================
 * RESET PASSWORD
 * ==========================================
 */

export const resetPassword = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            email: rawEmail,
            otp: rawOtp,
            newPassword,
        } = req.body ?? {};

        const email =
            normalizeEmail(rawEmail);

        if (
            !email ||
            (typeof rawOtp !== "string" &&
                typeof rawOtp !== "number") ||
            typeof newPassword !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid password reset request.",
            });
        }

        const otp =
            String(rawOtp).trim();

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid verification code.",
            });
        }

        if (
            !isValidPassword(
                newPassword
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
            });
        }

        /**
         * Verify OTP.
         *
         * The service must delete/consume the
         * OTP atomically after successful reset.
         */
        await PasswordResetService.verifyOtp(
            email,
            otp
        );

        const user =
            await User.findOne({
                email,
            }).select(
                "+password +provider"
            );

        if (!user) {
            return res.status(400).json({
                success: false,
                message:
                    "Unable to reset password.",
            });
        }

        /**
         * Only local accounts should have their
         * password changed here.
         */
        if (
            user.provider !== "local"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Unable to reset password.",
            });
        }

        /**
         * Stronger bcrypt cost than the old
         * bcrypt(10).
         */
        user.password =
            await bcrypt.hash(
                newPassword,
                12
            );

        await user.save();

        await PasswordResetService.deleteOtp(
            email
        );

        /**
         * IMPORTANT:
         *
         * After we add JWT token versioning/
         * session invalidation, this endpoint
         * should invalidate every existing
         * session for this user.
         */

        void EmailService
            .sendPasswordChangedEmail(
                user.name,
                user.email
            )
            .catch((error) => {
                console.error(
                    "[PASSWORD CHANGED EMAIL ERROR]",
                    error
                );
            });

        return res.status(200).json({
            success: true,
            message:
                "Password reset successfully.",
        });
    } catch (error) {
        console.error(
            "[RESET PASSWORD ERROR]",
            error
        );

        return res.status(400).json({
            success: false,
            message:
                "Invalid or expired password reset request.",
        });
    }
};