import crypto from "crypto";

import { PaymentProvider } from "./payment.interface";

import {
    InitializePaymentDto,
    InitializePaymentResponse,
    VerifyPaymentResponse,
    VerifiedWebhookPayload,
    PaymentStatus,
    PaymentEvent,
    IPaymentMetadata,
} from "../../types/payment.types";

import { koraClient } from "./payment.client";

export class KoraService
    implements PaymentProvider {
    async initializePayment(
        payload: InitializePaymentDto
    ): Promise<InitializePaymentResponse> {
        const response =
            await koraClient.post(
                "/merchant/api/v1/charges/initialize",
                {
                    amount:
                        payload.amount,

                    currency:
                        "NGN",

                    reference:
                        payload.reference,

                    customer: {
                        email:
                            payload.email,
                    },

                    redirect_url:
                        payload.callbackUrl,

                    metadata:
                        payload.metadata,
                }
            );

        const authorizationUrl =
            response.data?.data
                ?.checkout_url;

        if (
            typeof authorizationUrl !==
            "string"
        ) {
            throw new Error(
                "Kora did not return a checkout URL."
            );
        }

        return {
            authorizationUrl,

            reference:
                payload.reference,
        };
    }

    async verifyPayment(
        reference: string
    ): Promise<VerifyPaymentResponse> {
        const response =
            await koraClient.get(
                `/merchant/api/v1/transactions/${encodeURIComponent(
                    reference
                )}`
            );

        const data =
            response.data?.data;

        if (!data) {
            throw new Error(
                "Invalid Kora verification response."
            );
        }

        return {
            success:
                data.status ===
                "success",

            reference,

            amount:
                Number(data.amount) || 0,

            status:
                String(data.status),

            paidAt:
                data.created_at ??
                null,

            providerResponse:
                data,
        };
    }

    verifyWebhookSignature(
        payload: unknown,
        signature?: string
    ): boolean {
        if (
            !signature ||
            typeof signature !== "string"
        ) {
            return false;
        }

        const secret =
            process.env.KORA_SECRET_KEY
        if (!secret) {
            console.error(
                "KORA_WEBHOOK_SECRET is not configured."
            );

            return false;
        }

        const body =
            JSON.stringify(payload);

        const expectedSignature =
            crypto
                .createHmac(
                    "sha256",
                    secret
                )
                .update(body)
                .digest("hex");

        const expectedBuffer =
            Buffer.from(
                expectedSignature,
                "utf8"
            );

        const receivedBuffer =
            Buffer.from(
                signature,
                "utf8"
            );

        if (
            expectedBuffer.length !==
            receivedBuffer.length
        ) {
            return false;
        }

        return crypto.timingSafeEqual(
            expectedBuffer,
            receivedBuffer
        );
    }

    async parseWebhook(
        payload: unknown,
        signature?: string
    ): Promise<VerifiedWebhookPayload> {
        if (
            !this.verifyWebhookSignature(
                payload,
                signature
            )
        ) {
            throw new Error(
                "Invalid Kora webhook signature."
            );
        }

        if (
            !payload ||
            typeof payload !== "object"
        ) {
            throw new Error(
                "Invalid Kora webhook payload."
            );
        }

        const root =
            payload as Record<
                string,
                unknown
            >;

        const webhookData =
            root.data;

        if (
            !webhookData ||
            typeof webhookData !==
            "object"
        ) {
            throw new Error(
                "Invalid Kora webhook data."
            );
        }

        const data =
            webhookData as Record<
                string,
                unknown
            >;

        const reference =
            data.reference ??
            data.transactionReference;

        if (
            typeof reference !==
            "string" ||
            !reference
        ) {
            throw new Error(
                "Kora webhook reference is missing."
            );
        }

        const status =
            data.status;

        if (
            status !== "success"
        ) {
            throw new Error(
                "Kora webhook payment was not successful."
            );
        }

        const amount =
            data.amount;

        if (
            (typeof amount !== "number" &&
                typeof amount !== "string") ||
            !Number.isFinite(
                Number(amount)
            )
        ) {
            throw new Error(
                "Invalid Kora webhook amount."
            );
        }

        const normalizedEvent: PaymentEvent =
            "payment.success";

        const normalizedStatus: PaymentStatus =
            "SUCCESS";

        /**
         * Store the provider response inside
         * application-safe metadata.
         */
        const metadata: IPaymentMetadata = {
            providerData:
                data,
        };

        return {
            event:
                normalizedEvent,

            reference,

            amount:
                Number(amount),

            status:
                normalizedStatus,

            metadata,
        };
    }
}