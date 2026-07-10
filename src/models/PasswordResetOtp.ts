import mongoose, {
    Document,
    Schema,
} from "mongoose";

export interface IPasswordResetOtp
    extends Document {
    /**
     * Email of the account requesting
     * a password reset.
     */
    email: string;

    /**
     * Hashed OTP.
     */
    otp: string;

    /**
     * OTP expiration time.
     */
    expiresAt: Date;

    /**
     * Timestamp of the last OTP sent.
     * Used for resend cooldowns.
     */
    lastSentAt: Date;

    /**
     * Number of OTPs sent.
     */
    attempts: number;

    /**
     * Number of failed verification attempts.
     */
    verificationAttempts: number;

    createdAt: Date;

    updatedAt: Date;
}

const passwordResetOtpSchema =
    new Schema<IPasswordResetOtp>(
        {
            email: {
                type: String,
                required: true,
                lowercase: true,
                trim: true,
                unique: true,
            },

            otp: {
                type: String,
                required: true,
            },

            expiresAt: {
                type: Date,
                required: true,
            },

            /**
             * Prevent OTP spam.
             */
            lastSentAt: {
                type: Date,
                default: Date.now,
            },

            /**
             * Number of OTPs generated.
             */
            attempts: {
                type: Number,
                default: 1,
                min: 1,
            },

            /**
             * Number of incorrect OTP submissions.
             */
            verificationAttempts: {
                type: Number,
                default: 0,
                min: 0,
            },
        },
        {
            timestamps: true,
        }
    );

/**
 * Automatically remove expired OTPs.
 *
 * MongoDB TTL monitor runs
 * approximately every 60 seconds.
 */
passwordResetOtpSchema.index(
    {
        expiresAt: 1,
    },
    {
        expireAfterSeconds: 0,
    }
);

export default mongoose.model<IPasswordResetOtp>(
    "PasswordResetOtp",
    passwordResetOtpSchema
);