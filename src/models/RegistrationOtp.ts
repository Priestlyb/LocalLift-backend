import mongoose, {
    Document,
    Schema,
    Types,
} from "mongoose";

export interface IRegistrationOtp
    extends Document {
    user?: Types.ObjectId;

    /**
     * User's name supplied during registration.
     */
    name: string;

    /**
     * Normalized user email address.
     */
    email: string;

    /**
     * Hashed password supplied during registration.
     *
     * This is hidden from normal MongoDB queries
     * using select: false.
     */
    password: string;

    /**
     * Hashed OTP.
     *
     * This is hidden from normal MongoDB queries
     * using select: false.
     */
    otp: string;

    /**
     * OTP expiration time.
     */
    expiresAt: Date;

    /**
     * Timestamp of the most recently sent OTP.
     *
     * Used for resend cooldowns.
     */
    lastSentAt: Date;

    /**
     * Number of OTPs generated for this
     * registration attempt.
     */
    attempts: number;

    /**
     * Number of failed OTP verification attempts.
     */
    verificationAttempts: number;

    createdAt: Date;

    updatedAt: Date;
}

/**
 * ==========================================
 * SCHEMA
 * ==========================================
 */

const registrationOtpSchema =
    new Schema<IRegistrationOtp>(
        {
            /**
             * ==========================================
             * USER
             * ==========================================
             *
             * Optional reference to the user.
             *
             * Currently not required by the registration
             * flow, but kept for compatibility.
             */
            user: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: false,
                default: null,
            },

            /**
             * ==========================================
             * REGISTRATION NAME
             * ==========================================
             */
            name: {
                type: String,
                required: true,
                trim: true,

                minlength: 1,
                maxlength: 100,
            },

            /**
             * ==========================================
             * EMAIL
             * ==========================================
             *
             * Always store a normalized email.
             *
             * IMPORTANT:
             *
             * Do not use `index: true` here because
             * the explicit unique index below already
             * creates the required index.
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
             * PASSWORD HASH
             * ==========================================
             *
             * IMPORTANT:
             *
             * This must NEVER contain the plaintext
             * password.
             *
             * The registration service/controller
             * should hash the password before saving.
             */
            password: {
                type: String,
                required: true,

                /**
                 * Never return the password hash
                 * unless explicitly requested.
                 */
                select: false,
            },

            /**
             * ==========================================
             * OTP HASH
             * ==========================================
             *
             * IMPORTANT:
             *
             * Never store the plaintext OTP.
             *
             * The OTP should be hashed before being
             * saved to MongoDB.
             */
            otp: {
                type: String,
                required: true,

                /**
                 * Never return the OTP hash by default.
                 */
                select: false,

                /**
                 * SHA-256 produces a 64-character
                 * hexadecimal hash.
                 *
                 * Keep this validation only if your
                 * registration service uses SHA-256.
                 */
                minlength: 64,
                maxlength: 64,

                match: /^[a-f0-9]{64}$/i,
            },

            /**
             * ==========================================
             * OTP EXPIRATION
             * ==========================================
             *
             * Do NOT use `index: true` here.
             *
             * The explicit TTL index below handles
             * automatic expiration.
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
             * Used to enforce the OTP resend cooldown.
             */
            lastSentAt: {
                type: Date,
                required: true,
                default: Date.now,
            },

            /**
             * ==========================================
             * OTP GENERATION ATTEMPTS
             * ==========================================
             *
             * Number of OTPs generated for this
             * registration attempt.
             *
             * Current application limit:
             *
             * Maximum 5 OTP generations.
             */
            attempts: {
                type: Number,
                required: true,
                default: 1,

                min: 1,
                max: 5,

                validate: {
                    validator: (
                        value: number
                    ): boolean =>
                        Number.isSafeInteger(
                            value
                        ),

                    message:
                        "OTP generation attempts must be a safe integer.",
                },
            },

            /**
             * ==========================================
             * VERIFICATION ATTEMPTS
             * ==========================================
             *
             * Number of failed OTP verification
             * attempts.
             *
             * Current application limit:
             *
             * Maximum 5 failed attempts.
             */
            verificationAttempts: {
                type: Number,
                required: true,
                default: 0,

                min: 0,
                max: 5,

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
             * Prevent unexpected fields from
             * being persisted.
             */
            strict: true,
        }
    );

/**
 * ==========================================
 * INDEXES
 * ==========================================
 */

/**
 * ==========================================
 * UNIQUE EMAIL INDEX
 * ==========================================
 *
 * Allows only one pending registration
 * record for an email address.
 *
 * This replaces the previous `index: true`
 * on the email field.
 */
registrationOtpSchema.index(
    {
        email: 1,
    },
    {
        unique: true,
    }
);

/**
 * ==========================================
 * TTL INDEX
 * ==========================================
 *
 * Automatically deletes expired registration
 * OTP documents.
 *
 * MongoDB's TTL monitor normally checks
 * approximately once every 60 seconds.
 *
 * IMPORTANT:
 *
 * TTL cleanup does NOT replace the runtime
 * expiration check in the OTP verification
 * service.
 */
registrationOtpSchema.index(
    {
        expiresAt: 1,
    },
    {
        expireAfterSeconds: 0,
    }
);

/**
 * ==========================================
 * EXPIRATION VALIDATION
 * ==========================================
 *
 * Make sure newly created OTP records have
 * an expiration time in the future.
 *
 * This does NOT replace the runtime expiration
 * check during OTP verification.
 */
registrationOtpSchema.path(
    "expiresAt"
).validate({
    validator: function (
        value: Date
    ): boolean {
        return (
            value instanceof Date &&
            !Number.isNaN(
                value.getTime()
            ) &&
            value.getTime() > Date.now()
        );
    },

    message:
        "OTP expiration time must be in the future.",
});

/**
 * ==========================================
 * MODEL
 * ==========================================
 */

const RegistrationOtp =
    mongoose.model<IRegistrationOtp>(
        "RegistrationOtp",
        registrationOtpSchema
    );

export default RegistrationOtp;