import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
    /**
     * Send registration OTP email.
     */
    static async sendRegistrationOtpEmail(
        name: string,
        email: string,
        otp: string
    ) {
        await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to: email,
            subject: "Verify your LocalLift account",
            html: `
                <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
                    <h2 style="color: #2563EB;">
                        Welcome to LocalLift
                    </h2>

                    <p>
                        Hi <strong>${name}</strong>,
                    </p>

                    <p>
                        Thank you for signing up for LocalLift.
                        To complete your registration, please verify your email
                        address using the verification code below.
                    </p>

                    <div
                        style="
                            background:#F3F4F6;
                            border-radius:8px;
                            padding:20px;
                            text-align:center;
                            margin:32px 0;
                        "
                    >
                        <span
                            style="
                                font-size:32px;
                                font-weight:bold;
                                letter-spacing:8px;
                                color:#2563EB;
                            "
                        >
                            ${otp}
                        </span>
                    </div>

                    <p>
                        This verification code will expire in
                        <strong>10 minutes</strong>.
                    </p>

                    <p>
                        If you did not request this account,
                        you can safely ignore this email.
                    </p>

                    <hr style="margin:32px 0;" />

                    <p style="font-size:14px;color:#6B7280;">
                        — The LocalLift Team
                    </p>
                </div>
            `,
        });
    }

    /**
     * Send password reset OTP email.
     */
    static async sendPasswordResetOtpEmail(
        name: string,
        email: string,
        otp: string
    ) {
        await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to: email,
            subject: "Reset your LocalLift password",
            html: `
                <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
                    <h2 style="color:#2563EB;">
                        Password Reset Request
                    </h2>

                    <p>
                        Hi <strong>${name}</strong>,
                    </p>

                    <p>
                        We received a request to reset your LocalLift password.
                        Use the verification code below to continue.
                    </p>

                    <div
                        style="
                            background:#F3F4F6;
                            border-radius:8px;
                            padding:20px;
                            text-align:center;
                            margin:32px 0;
                        "
                    >
                        <span
                            style="
                                font-size:32px;
                                font-weight:bold;
                                letter-spacing:8px;
                                color:#2563EB;
                            "
                        >
                            ${otp}
                        </span>
                    </div>

                    <p>
                        This verification code will expire in
                        <strong>10 minutes</strong>.
                    </p>

                    <p>
                        If you didn't request a password reset,
                        you can safely ignore this email. Your password
                        will remain unchanged.
                    </p>

                    <hr style="margin:32px 0;" />

                    <p style="font-size:14px;color:#6B7280;">
                        — The LocalLift Team
                    </p>
                </div>
            `,
        });
    }

    /**
     * Notify user that password has been changed.
     */
    static async sendPasswordChangedEmail(
        name: string,
        email: string
    ) {
        await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to: email,
            subject: "Your LocalLift password has been changed",
            html: `
                <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
                    <h2 style="color:#10B981;">
                        Password Updated Successfully
                    </h2>

                    <p>
                        Hi <strong>${name}</strong>,
                    </p>

                    <p>
                        This is a confirmation that your LocalLift password
                        was successfully changed.
                    </p>

                    <p>
                        If you made this change, no further action is required.
                    </p>

                    <p>
                        <strong>
                            If you did NOT change your password,
                            please secure your account immediately
                            and contact support.
                        </strong>
                    </p>

                    <hr style="margin:32px 0;" />

                    <p style="font-size:14px;color:#6B7280;">
                        — The LocalLift Team
                    </p>
                </div>
            `,
        });
    }

    /**
     * Send welcome email after successful registration.
     */
    static async sendWelcomeEmail(
        name: string,
        email: string
    ) {
        await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to: email,
            subject: "Welcome to LocalLift 🎉",
            html: `
                <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
                    <h2 style="color:#2563EB;">
                        Welcome to LocalLift 🎉
                    </h2>

                    <p>
                        Hi <strong>${name}</strong>,
                    </p>

                    <p>
                        Your email has been successfully verified and your
                        LocalLift account is now active.
                    </p>

                    <p>
                        Your account has been enrolled on the
                        <strong>FREE</strong> plan.
                    </p>

                    <p>
                        You can now start creating AI-powered content to help
                        grow your business.
                    </p>

                    <hr style="margin:32px 0;" />

                    <h3>What's next?</h3>

                    <ul>
                        <li>Create your first AI-powered post.</li>
                        <li>Complete your business profile.</li>
                        <li>Generate stunning images and marketing content.</li>
                        <li>Upgrade anytime for more monthly generations.</li>
                    </ul>

                    <br />

                    <p>
                        We're excited to have you on board.
                    </p>

                    <p>
                        — <strong>The LocalLift Team</strong>
                    </p>
                </div>
            `,
        });
    }

    /**
     * Send staff invitation email.
     */
    static async sendStaffInvitationEmail(
        staffName: string,
        staffEmail: string,
        ownerName: string,
        invitationUrl: string
    ) {
        await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to: staffEmail,
            subject: `${ownerName} invited you to join LocalLift`,
            html: `
                <div
                    style="
                        font-family: Arial, Helvetica, sans-serif;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 24px;
                        color: #333;
                    "
                >
                    <h2 style="color:#2563EB;">
                        You've been invited to LocalLift
                    </h2>

                    <p>
                        Hi <strong>${staffName}</strong>,
                    </p>

                    <p>
                        <strong>${ownerName}</strong> has invited you
                        to join their LocalLift business account as a
                        staff member.
                    </p>

                    <p>
                        Click the button below to accept the invitation
                        and create your staff account.
                    </p>

                    <div style="text-align:center; margin:32px 0;">
                        <a
                            href="${invitationUrl}"
                            style="
                                display:inline-block;
                                background:#2563EB;
                                color:#ffffff;
                                text-decoration:none;
                                padding:14px 24px;
                                border-radius:8px;
                                font-weight:bold;
                            "
                        >
                            Accept Invitation
                        </a>
                    </div>

                    <p>
                        This invitation will expire in
                        <strong>24 hours</strong>.
                    </p>

                    <p>
                        If you were not expecting this invitation,
                        you can safely ignore this email.
                    </p>

                    <hr style="margin:32px 0;" />

                    <p
                        style="
                            font-size:14px;
                            color:#6B7280;
                        "
                    >
                        — The LocalLift Team
                    </p>
                </div>
            `,
        });
    }
}