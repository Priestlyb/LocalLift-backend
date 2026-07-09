import bcrypt from "bcrypt";

import RegistrationOtp, {
    IRegistrationOtp,
} from "../../models/RegistrationOtp";
import { generateOtp } from "../../utils/generateOtp";

class OtpService {
    /**
     * Create or update a pending registration
     * and return the plain OTP for emailing.
     */
    static async createRegistrationOtp(
        name: string,
        email: string,
        password: string,
        passwordAlreadyHashed: boolean = false
    ): Promise<string> {
        const otp = generateOtp();

        const hashedOtp = await bcrypt.hash(
            otp,
            10
        );

        const passwordToStore =
            passwordAlreadyHashed
                ? password
                : await bcrypt.hash(
                    password,
                    10
                );

        const expiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        ); // 10 minutes

        const existing =
            await RegistrationOtp.findOne({
                email,
            });

        if (existing) {
            existing.name = name;
            existing.password =
                passwordToStore;
            existing.otp = hashedOtp;
            existing.expiresAt =
                expiresAt;
            existing.lastSentAt =
                new Date();

            /**
             * New OTP generated.
             */
            existing.attempts += 1;

            /**
             * Reset failed verification attempts.
             */
            existing.verificationAttempts = 0;

            await existing.save();
        } else {
            await RegistrationOtp.create({
                name,
                email,
                password:
                    passwordToStore,
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
     * Verify a registration OTP.
     */
    static async verifyRegistrationOtp(
        email: string,
        otp: string
    ): Promise<IRegistrationOtp> {
        const registration =
            await RegistrationOtp.findOne({
                email,
            });

        if (!registration) {
            throw new Error(
                "Verification request not found."
            );
        }

        /**
         * OTP expired.
         */
        if (
            registration.expiresAt.getTime() <
            Date.now()
        ) {
            await RegistrationOtp.deleteOne({
                email,
            });

            throw new Error(
                "Verification code has expired."
            );
        }

        const isValid =
            await bcrypt.compare(
                otp,
                registration.otp
            );

        if (!isValid) {
            registration.verificationAttempts += 1;

            /**
             * Maximum incorrect attempts.
             */
            if (
                registration.verificationAttempts >=
                5
            ) {
                await RegistrationOtp.deleteOne(
                    {
                        email,
                    }
                );

                throw new Error(
                    "Too many incorrect verification attempts. Please request a new verification code."
                );
            }

            await registration.save();

            throw new Error(
                "Invalid verification code."
            );
        }

        return registration;
    }

    /**
     * Delete the pending registration
     * after successful verification.
     */
    static async deleteRegistrationOtp(
        email: string
    ): Promise<void> {
        await RegistrationOtp.deleteOne({
            email,
        });
    }

    /**
     * Retrieve a pending registration.
     */
    static async getRegistration(
        email: string
    ): Promise<IRegistrationOtp | null> {
        return RegistrationOtp.findOne({
            email,
        });
    }
}

export default OtpService;