import { OAuth2Client, TokenPayload } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface GoogleUser {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
    emailVerified: boolean;
}

export class GoogleService {
    /**
     * Verify a Google ID token and return the user's profile.
     */
    static async verifyIdToken(idToken: string): Promise<GoogleUser> {
        if (!idToken) {
            throw new Error("Google ID token is required.");
        }

        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload: TokenPayload | undefined = ticket.getPayload();

        if (!payload) {
            throw new Error("Unable to verify Google ID token.");
        }

        const {
            sub,
            email,
            name,
            picture,
            email_verified,
        } = payload;

        if (!sub) {
            throw new Error("Google user ID is missing.");
        }

        if (!email) {
            throw new Error("Google account does not contain an email address.");
        }

        return {
            googleId: sub,
            email,
            name: name ?? "",
            picture,
            emailVerified: email_verified ?? false,
        };
    }
}