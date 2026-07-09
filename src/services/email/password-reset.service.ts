import bcrypt from "bcrypt";

import PasswordResetOtp from "../../models/PasswordResetOtp";
import { generateOtp } from "../../utils/generateOtp";

class PasswordResetService {
    /**
     * Create or update a password reset OTP.
     * Returns the plain OTP for emailing.
     */
    static async createOtp(email: string) {
        const otp = generateOtp();

        const hashedOtp = await bcrypt.hash(
            otp,
            10
        );

        const expiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        ); // 10 minutes

        const existing =
            await PasswordResetOtp.findOne({
                email,
            });

        if (existing) {
            existing.otp = hashedOtp;
            existing.expiresAt = expiresAt;
            existing.lastSentAt =
                new Date();
            existing.attempts += 1;

            /**
             * New OTP = reset failed attempts.
             */
            existing.verificationAttempts = 0;

            await existing.save();
        } else {
            await PasswordResetOtp.create({
                email,
                otp: hashedOtp,
                expiresAt,
                lastSentAt: new Date(),
                attempts: 1,
                verificationAttempts: 0,
            });
        }

        return otp;
    }

    /**
     * Verify a password reset OTP.
     */
    static async verifyOtp(
        email: string,
        otp: string
    ) {
        const reset =
            await PasswordResetOtp.findOne({
                email,
            });

        if (!reset) {
            throw new Error(
                "Password reset request not found."
            );
        }

        if (
            reset.expiresAt.getTime() <
            Date.now()
        ) {
            await PasswordResetOtp.deleteOne({
                email,
            });

            throw new Error(
                "Verification code has expired."
            );
        }

        const isValid =
            await bcrypt.compare(
                otp,
                reset.otp
            );

        if (!isValid) {
            reset.verificationAttempts += 1;

            /**
             * Maximum incorrect attempts.
             */
            if (
                reset.verificationAttempts >=
                5
            ) {
                await PasswordResetOtp.deleteOne(
                    {
                        email,
                    }
                );

                throw new Error(
                    "Too many incorrect verification attempts. Please request a new code."
                );
            }

            await reset.save();

            throw new Error(
                "Invalid verification code."
            );
        }

        return reset;
    }

    /**
     * Delete a password reset request.
     */
    static async deleteOtp(
        email: string
    ) {
        await PasswordResetOtp.deleteOne({
            email,
        });
    }

    /**
     * Retrieve an existing password reset request.
     */
    static async getOtp(
        email: string
    ) {
        return PasswordResetOtp.findOne({
            email,
        });
    }
}

export default PasswordResetService;