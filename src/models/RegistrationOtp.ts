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
     * User's email address.
     */
    email: string;

    /**
     * Hashed password supplied during registration.
     * The User document is only created after
     * successful OTP verification.
     */
    password: string;

    /**
     * Hashed OTP.
     */
    otp: string;

    /**
     * OTP expiration time.
     */
    expiresAt: Date;

    /**
     * Timestamp of the most recently sent OTP.
     * Used to enforce resend cooldowns.
     */
    lastSentAt: Date;

    /**
     * Number of OTPs sent for this registration.
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
            user: {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: false,
            },

            name: {
                type: String,
                required: true,
                trim: true,
            },

            email: {
                type: String,
                required: true,
                lowercase: true,
                trim: true,
                unique: true,
            },

            password: {
                type: String,
                required: true,
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
             * Used to prevent OTP spam.
             * Example: only allow one OTP every 60 seconds.
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
             * Number of incorrect verification attempts.
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
 * Automatically remove expired OTP documents.
 *
 * MongoDB's TTL monitor runs approximately
 * once every 60 seconds.
 */
registrationOtpSchema.index(
    {
        expiresAt: 1,
    },
    {
        expireAfterSeconds: 0,
    }
);

export default mongoose.model<IRegistrationOtp>(
    "RegistrationOtp",
    registrationOtpSchema
);