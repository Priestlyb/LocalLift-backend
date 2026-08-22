import bcrypt from "bcrypt";

import RegistrationOtp, {
    IRegistrationOtp,
} from "../../models/RegistrationOtp";

import { generateOtp } from "../../utils/generateOtp";

const OTP_EXPIRATION_MS = 10 * 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

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
            BCRYPT_ROUNDS
        );

        const passwordToStore =
            passwordAlreadyHashed
                ? password
                : await bcrypt.hash(
                    password,
                    BCRYPT_ROUNDS
                );

        const expiresAt = new Date(
            Date.now() + OTP_EXPIRATION_MS
        );

        await RegistrationOtp.findOneAndUpdate(
            { email },
            {
                $set: {
                    name,
                    password: passwordToStore,
                    otp: hashedOtp,
                    expiresAt,
                    lastSentAt: new Date(),
                    verificationAttempts: 0,
                },

                $inc: {
                    attempts: 1,
                },
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            }
        );

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
                "Invalid or expired verification code."
            );
        }

        /**
         * Check expiration.
         */
        if (
            registration.expiresAt.getTime() <=
            Date.now()
        ) {
            await RegistrationOtp.deleteOne({
                _id: registration._id,
            });

            throw new Error(
                "Invalid or expired verification code."
            );
        }

        /**
         * Check whether maximum attempts
         * have already been reached.
         */
        if (
            registration.verificationAttempts >=
            MAX_VERIFICATION_ATTEMPTS
        ) {
            await RegistrationOtp.deleteOne({
                _id: registration._id,
            });

            throw new Error(
                "Too many verification attempts. Please request a new code."
            );
        }

        const isValid =
            await bcrypt.compare(
                otp,
                registration.otp
            );

        if (!isValid) {
            const updated =
                await RegistrationOtp.findOneAndUpdate(
                    {
                        _id: registration._id,
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
                await RegistrationOtp.deleteOne({
                    _id: registration._id,
                });

                throw new Error(
                    "Too many verification attempts. Please request a new code."
                );
            }

            throw new Error(
                "Invalid or expired verification code."
            );
        }

        return registration;
    }

    /**
     * Delete pending registration.
     */
    static async deleteRegistrationOtp(
        email: string
    ): Promise<void> {
        await RegistrationOtp.deleteOne({
            email,
        });
    }

    /**
     * Retrieve pending registration.
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