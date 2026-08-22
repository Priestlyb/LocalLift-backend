import mongoose, {
    Document,
    Model,
    Schema,
} from "mongoose";

export interface IPasswordResetOtp
    extends Document {
    email: string;

    /**
     * Hashed OTP.
     *
     * Never store the plaintext OTP.
     */
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
            /**
             * ==========================================
             * EMAIL
             * ==========================================
             *
             * Always normalize email addresses before
             * storing them.
             *
             * The explicit unique index below handles
             * indexing and uniqueness.
             */
            email: {
                type: String,
                required: true,
                lowercase: true,
                trim: true,

                minlength: 5,
                maxlength: 254,
            },

            /**
             * ==========================================
             * OTP
             * ==========================================
             *
             * IMPORTANT:
             *
             * Never store the plaintext OTP.
             *
             * The controller/service should hash the
             * OTP before saving it.
             */
            otp: {
                type: String,
                required: true,

                /**
                 * SHA-256 hashes are 64 hexadecimal
                 * characters.
                 */
                minlength: 64,
                maxlength: 64,

                match: /^[a-f0-9]{64}$/i,
            },

            /**
             * ==========================================
             * EXPIRATION
             * ==========================================
             *
             * Do NOT use index: true here.
             *
             * The explicit TTL index below handles
             * expiration.
             */
            expiresAt: {
                type: Date,
                required: true,
            },

            /**
             * ==========================================
             * LAST SENT AT
             * ==========================================
             *
             * Used to prevent OTP resend abuse.
             */
            lastSentAt: {
                type: Date,
                required: true,
            },

            /**
             * ==========================================
             * GENERATION ATTEMPTS
             * ==========================================
             *
             * Number of OTPs generated for this
             * password reset request.
             */
            attempts: {
                type: Number,
                default: 0,

                min: 0,

                /**
                 * Prevent accidentally storing
                 * non-integer attempt counts.
                 */
                validate: {
                    validator: (
                        value: number
                    ): boolean =>
                        Number.isSafeInteger(
                            value
                        ),

                    message:
                        "Attempts must be a safe integer.",
                },
            },

            /**
             * ==========================================
             * VERIFICATION ATTEMPTS
             * ==========================================
             *
             * Number of incorrect OTP verification
             * attempts.
             */
            verificationAttempts: {
                type: Number,
                default: 0,

                min: 0,

                validate: {
                    validator: (
                        value: number
                    ): boolean =>
                        Number.isSafeInteger(
                            value
                        ),

                    message:
                        "Verification attempts must be a safe integer.",
                },
            },

            /**
             * ==========================================
             * VERIFIED AT
             * ==========================================
             *
             * null = not verified
             * Date = successfully verified
             */
            verifiedAt: {
                type: Date,
                default: null,
            },
        },
        {
            /**
             * Automatically maintain:
             *
             * createdAt
             * updatedAt
             */
            timestamps: true,

            /**
             * Reject fields that aren't explicitly
             * defined in the schema.
             */
            strict: true,
        }
    );

/**
 * ==========================================
 * TTL INDEX
 * ==========================================
 *
 * Automatically deletes expired password
 * reset records.
 *
 * MongoDB's TTL monitor normally runs
 * approximately once every 60 seconds.
 *
 * IMPORTANT:
 *
 * This is cleanup only.
 *
 * The password reset controller/service
 * MUST still check expiresAt at verification
 * time.
 */
passwordResetOtpSchema.index(
    {
        expiresAt: 1,
    },
    {
        expireAfterSeconds: 0,
    }
);

/**
 * ==========================================
 * EMAIL UNIQUE INDEX
 * ==========================================
 *
 * Ensures only one password reset record
 * exists for an email at a time.
 *
 * This also creates the required index,
 * so `email` does not need `index: true`
 * in the schema field definition.
 */
passwordResetOtpSchema.index(
    {
        email: 1,
    },
    {
        unique: true,
    }
);

/**
 * ==========================================
 * MODEL
 * ==========================================
 */

const PasswordResetOtp: Model<IPasswordResetOtp> =
    mongoose.model<IPasswordResetOtp>(
        "PasswordResetOtp",
        passwordResetOtpSchema
    );

export default PasswordResetOtp;