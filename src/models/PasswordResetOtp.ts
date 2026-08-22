import mongoose, {
    Document,
    Model,
    Schema,
} from "mongoose";

export interface IPasswordResetOtp
    extends Document {
    email: string;

    otp: string;

    expiresAt: Date;

    lastSentAt: Date;

    attempts: number;

    verificationAttempts: number;

    verifiedAt?: Date | null;

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
                index: true,
            },

            /**
             * Never store the plaintext OTP.
             */
            otp: {
                type: String,
                required: true,
            },

            /**
             * OTP automatically expires
             * from MongoDB.
             */
            expiresAt: {
                type: Date,
                required: true,
                index: true,
            },

            /**
             * Used for resend throttling.
             */
            lastSentAt: {
                type: Date,
                required: true,
            },

            /**
             * Number of OTPs generated.
             */
            attempts: {
                type: Number,
                default: 0,
                min: 0,
            },

            /**
             * Number of incorrect verification attempts.
             */
            verificationAttempts: {
                type: Number,
                default: 0,
                min: 0,
            },

            /**
             * Records successful verification.
             */
            verifiedAt: {
                type: Date,
                default: null,
            },
        },
        {
            timestamps: true,
        }
    );

/**
 * Automatically delete expired
 * password reset records.
 */
passwordResetOtpSchema.index(
    { expiresAt: 1 },
    {
        expireAfterSeconds: 0,
    }
);

/**
 * Only one active reset request
 * should exist for an email.
 */
passwordResetOtpSchema.index(
    { email: 1 },
    { unique: true }
);

const PasswordResetOtp: Model<IPasswordResetOtp> =
    mongoose.model<IPasswordResetOtp>(
        "PasswordResetOtp",
        passwordResetOtpSchema
    );

export default PasswordResetOtp;