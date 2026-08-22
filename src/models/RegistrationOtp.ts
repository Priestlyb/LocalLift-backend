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

const registrationOtpSchema =
    new Schema<IRegistrationOtp>(
        {
            /**
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
             * Registration name.
             */
            name: {
                type: String,
                required: true,
                trim: true,
                minlength: 1,
                maxlength: 100,
            },

            /**
             * Normalized email.
             *
             * The controller should normalize the email
             * before creating/updating this document.
             */
            email: {
                type: String,
                required: true,
                lowercase: true,
                trim: true,
                minlength: 5,
                maxlength: 254,
                unique: true,
                index: true,
            },

            /**
             * Password hash.
             *
             * IMPORTANT:
             * This is NOT the plaintext password.
             *
             * select: false prevents accidental exposure
             * when RegistrationOtp documents are queried.
             */
            password: {
                type: String,
                required: true,
                select: false,
            },

            /**
             * Hashed OTP.
             *
             * Never store the plaintext OTP in MongoDB.
             */
            otp: {
                type: String,
                required: true,
                select: false,
            },

            /**
             * OTP expiration.
             *
             * MongoDB TTL index below automatically removes
             * expired registration documents.
             */
            expiresAt: {
                type: Date,
                required: true,
                index: true,
            },

            /**
             * Timestamp of the most recently sent OTP.
             *
             * Used to enforce the resend cooldown.
             */
            lastSentAt: {
                type: Date,
                required: true,
                default: Date.now,
            },

            /**
             * Number of OTPs generated.
             *
             * The controller/service currently allows
             * a maximum of 5 OTP generations.
             */
            attempts: {
                type: Number,
                required: true,
                default: 1,
                min: 1,
                max: 5,
            },

            /**
             * Number of failed OTP verification attempts.
             *
             * The OTP service currently allows a maximum
             * of 5 failed verification attempts.
             */
            verificationAttempts: {
                type: Number,
                required: true,
                default: 0,
                min: 0,
                max: 5,
            },
        },
        {
            timestamps: true,

            /**
             * Prevent unexpected fields from being persisted.
             *
             * Mongoose strict mode is enabled by default,
             * but explicitly keeping it here makes the
             * security intention clear.
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
 * One pending registration per email.
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
 * Automatically delete expired registration
 * documents.
 *
 * MongoDB's TTL monitor normally checks
 * approximately once every 60 seconds.
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
 * VALIDATION
 * ==========================================
 */

/**
 * Make sure the expiration time is actually
 * in the future when a document is created.
 *
 * Note:
 * This does not replace the runtime expiration
 * check inside otp.service.ts.
 */
registrationOtpSchema.path(
    "expiresAt"
).validate({
    validator: function (
        value: Date
    ) {
        return value.getTime() > Date.now();
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