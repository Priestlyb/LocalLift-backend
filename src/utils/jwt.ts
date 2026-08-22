import jwt, {
    SignOptions,
    JwtPayload,
} from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

const JWT_ISSUER =
    process.env.JWT_ISSUER ||
    "locallift-api";

const JWT_AUDIENCE =
    process.env.JWT_AUDIENCE ||
    "locallift-client";

const JWT_EXPIRES_IN =
    process.env.JWT_EXPIRES_IN ||
    "15m";

/**
 * Fail immediately if the JWT secret is missing.
 *
 * Never allow the application to start with
 * an undefined or fallback JWT secret.
 */
if (!JWT_SECRET) {
    throw new Error(
        "JWT_SECRET environment variable is not configured."
    );
}

/**
 * Generate a short-lived access token.
 */
export const generateToken = (
    userId: string,
    role: string
): string => {
    const payload = {
        sub: userId,
        role,
    };

    const options: SignOptions = {
        expiresIn:
            JWT_EXPIRES_IN as SignOptions["expiresIn"],

        issuer: JWT_ISSUER,

        audience: JWT_AUDIENCE,

        algorithm: "HS256",
    };

    return jwt.sign(
        payload,
        JWT_SECRET,
        options
    );
};

/**
 * Verify and decode an access token.
 *
 * This should be used by auth.middleware.ts.
 */
export const verifyToken = (
    token: string
): JwtPayload => {
    const decoded = jwt.verify(
        token,
        JWT_SECRET,
        {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
            algorithms: ["HS256"],
        }
    );

    if (
        typeof decoded === "string" ||
        !decoded.sub ||
        typeof decoded.sub !== "string"
    ) {
        throw new Error(
            "Invalid authentication token."
        );
    }

    return decoded;
};