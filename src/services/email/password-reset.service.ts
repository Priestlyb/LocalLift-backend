import bcrypt from "bcrypt";

import PasswordResetOtp, {
    IPasswordResetOtp,
} from "../../models/PasswordResetOtp";

import { generateOtp } from "../../utils/generateOtp";

const OTP_EXPIRATION_MS =
    10 * 60 * 1000;

const MAX_VERIFICATION_ATTEMPTS = 5;

const MAX_OTP_REQUESTS = 5;

const BCRYPT_ROUNDS = 10;

class PasswordResetService {
    /**
     * Create or update a password reset OTP.
     *
     * Returns the plaintext OTP only so that
     * the controller can send it by email.
     *
     * The plaintext OTP is NEVER stored.
     */
    static async createOtp(
        email: string
    ): Promise<string> {
        const normalizedEmail =
            email.trim().toLowerCase();

        const existing =
            await PasswordResetOtp.findOne({
                email: normalizedEmail,
            });

        /**
         * Prevent unlimited OTP generation.
         */
        if (
            existing &&
            existing.attempts >=
            MAX_OTP_REQUESTS
        ) {
            throw new Error(
                "Maximum password reset requests reached. Please try again later."
            );
        }

        /**
         * Generate cryptographically secure OTP.
         */
        const otp = generateOtp();

        /**
         * Never store plaintext OTP.
         */
        const hashedOtp =
            await bcrypt.hash(
                otp,
                BCRYPT_ROUNDS
            );

        const expiresAt =
            new Date(
                Date.now() +
                OTP_EXPIRATION_MS
            );

        if (existing) {
            existing.otp = hashedOtp;

            existing.expiresAt =
                expiresAt;

            existing.lastSentAt =
                new Date();

            existing.verificationAttempts =
                0;

            existing.verifiedAt =
                null;

            existing.attempts += 1;

            await existing.save();
        } else {
            await PasswordResetOtp.create({
                email: normalizedEmail,

                otp: hashedOtp,

                expiresAt,

                lastSentAt: new Date(),

                attempts: 1,

                verificationAttempts: 0,

                verifiedAt: null,
            });
        }

        return otp;
    }

    /**
     * Verify a password reset OTP.
     *
     * IMPORTANT:
     * Successful verification marks the OTP
     * as verified.
     */
    static async verifyOtp(
        email: string,
        otp: string
    ): Promise<IPasswordResetOtp> {
        const normalizedEmail =
            email.trim().toLowerCase();

        const normalizedOtp =
            otp.trim();

        /**
         * Validate OTP format before
         * performing bcrypt work.
         */
        if (
            !/^\d{6}$/.test(
                normalizedOtp
            )
        ) {
            throw new Error(
                "Invalid or expired verification code."
            );
        }

        const reset =
            await PasswordResetOtp.findOne({
                email: normalizedEmail,
            });

        if (!reset) {
            throw new Error(
                "Invalid or expired verification code."
            );
        }

        /**
         * Do not allow reuse of a
         * previously verified OTP.
         */
        if (reset.verifiedAt) {
            throw new Error(
                "This verification code has already been used."
            );
        }

        /**
         * Check expiration.
         */
        if (
            reset.expiresAt.getTime() <=
            Date.now()
        ) {
            await PasswordResetOtp.deleteOne({
                _id: reset._id,
            });

            throw new Error(
                "Invalid or expired verification code."
            );
        }

        /**
         * Check maximum attempts before
         * performing bcrypt comparison.
         */
        if (
            reset.verificationAttempts >=
            MAX_VERIFICATION_ATTEMPTS
        ) {
            await PasswordResetOtp.deleteOne({
                _id: reset._id,
            });

            throw new Error(
                "Too many verification attempts. Please request a new code."
            );
        }

        const isValid =
            await bcrypt.compare(
                normalizedOtp,
                reset.otp
            );

        if (!isValid) {
            /**
             * Atomically increment failed
             * verification attempts.
             */
            const updated =
                await PasswordResetOtp.findOneAndUpdate(
                    {
                        _id: reset._id,

                        verificationAttempts: {
                            $lt:
                                MAX_VERIFICATION_ATTEMPTS,
                        },
                    },
                    {
                        $inc: {
                            verificationAttempts: 1,
                        },
                    },
                    {
                        new: true,
                    }
                );

            if (
                !updated ||
                updated.verificationAttempts >=
                MAX_VERIFICATION_ATTEMPTS
            ) {
                await PasswordResetOtp.deleteOne({
                    _id: reset._id,
                });

                throw new Error(
                    "Too many verification attempts. Please request a new code."
                );
            }

            throw new Error(
                "Invalid or expired verification code."
            );
        }

        /**
         * Atomically mark OTP as verified.
         *
         * This prevents two concurrent requests
         * from successfully verifying the same OTP.
         */
        const verified =
            await PasswordResetOtp.findOneAndUpdate(
                {
                    _id: reset._id,

                    verifiedAt: null,

                    expiresAt: {
                        $gt: new Date(),
                    },
                },
                {
                    $set: {
                        verifiedAt: new Date(),
                    },
                },
                {
                    new: true,
                }
            );

        if (!verified) {
            throw new Error(
                "Invalid or expired verification code."
            );
        }

        return verified;
    }

    /**
     * Delete a password reset request.
     */
    static async deleteOtp(
        email: string
    ): Promise<void> {
        await PasswordResetOtp.deleteOne({
            email:
                email.trim().toLowerCase(),
        });
    }

    /**
     * Retrieve an existing password
     * reset request.
     */
    static async getOtp(
        email: string
    ): Promise<IPasswordResetOtp | null> {
        return PasswordResetOtp.findOne({
            email:
                email.trim().toLowerCase(),
        });
    }
}

export default PasswordResetService;