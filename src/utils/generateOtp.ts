import crypto from "crypto";

/**
 * Generates a cryptographically secure numeric OTP.
 *
 * Uses Node.js crypto.randomInt(), which is designed
 * for security-sensitive random number generation.
 *
 * @param length Length of the OTP. Defaults to 6.
 * @returns Numeric OTP as a string.
 */
export const generateOtp = (
    length: number = 6
): string => {
    /**
     * Validate OTP length.
     */
    if (
        !Number.isInteger(length) ||
        length < 4 ||
        length > 10
    ) {
        throw new Error(
            "OTP length must be an integer between 4 and 10."
        );
    }

    const digits = "0123456789";

    let otp = "";

    for (let i = 0; i < length; i++) {
        const index = crypto.randomInt(
            0,
            digits.length
        );

        otp += digits[index];
    }

    return otp;
};