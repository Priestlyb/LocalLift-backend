import crypto from "crypto";

/**
 * Generates a cryptographically secure numeric OTP.
 *
 * @param length Length of the OTP. Defaults to 6.
 * @returns Numeric OTP as a string.
 */
export const generateOtp = (
    length: number = 6
): string => {
    if (length <= 0) {
        throw new Error(
            "OTP length must be greater than 0."
        );
    }

    let otp = "";

    while (otp.length < length) {
        const digit = crypto.randomInt(0, 10);
        otp += digit.toString();
    }

    return otp;
};