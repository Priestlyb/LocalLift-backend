import crypto from "crypto";

import { PaymentProvider } from "./payment.interface";

import {
    InitializePaymentDto,
    InitializePaymentResponse,
    VerifyPaymentResponse,
    VerifiedWebhookPayload,
    PaymentEvent,
    PaymentStatus,
    IPaymentMetadata,
} from "../../types/payment.types";

import { paystackClient } from "./payment.client";

export class PaystackService
    implements PaymentProvider {
    async initializePayment(
        payload: InitializePaymentDto
    ): Promise<InitializePaymentResponse> {
        try {
            const response =
                await paystackClient.post(
                    "/transaction/initialize",
                    {
                        email: payload.email,

                        /**
                         * Paystack expects the amount
                         * in kobo.
                         */
                        amount:
                            payload.amount * 100,

                        reference:
                            payload.reference,

                        callback_url:
                            payload.callbackUrl,

                        metadata:
                            payload.metadata,
                    }
                );

            const authorizationUrl =
                response.data?.data
                    ?.authorization_url;

            if (
                typeof authorizationUrl !==
                "string"
            ) {
                throw new Error(
                    "Paystack did not return an authorization URL."
                );
            }

            return {
                authorizationUrl,

                reference:
                    payload.reference,
            };
        } catch (error: any) {
            console.error(
                "Paystack initialization failed:",
                {
                    status:
                        error.response?.status,

                    data:
                        error.response?.data,

                    message:
                        error.message,
                }
            );

            throw error;
        }
    }

    async verifyPayment(
        reference: string
    ): Promise<VerifyPaymentResponse> {
        const response =
            await paystackClient.get(
                `/transaction/verify/${encodeURIComponent(
                    reference
                )}`
            );

        const data =
            response.data?.data;

        if (!data) {
            throw new Error(
                "Invalid Paystack verification response."
            );
        }

        return {
            success:
                data.status ===
                "success",

            reference,

            /**
             * Paystack returns kobo.
             */
            amount:
                Number(data.amount) / 100,

            status:
                String(data.status),

            paidAt:
                data.paid_at ?? null,

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
            process.env.PAYSTACK_SECRET_KEY;

        if (!secret) {
            console.error(
                "PAYSTACK_SECRET_KEY is not configured."
            );

            return false;
        }

        const body =
            JSON.stringify(payload);

        const expectedSignature =
            crypto
                .createHmac(
                    "sha512",
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
                "Invalid Paystack webhook signature."
            );
        }

        if (
            !payload ||
            typeof payload !== "object"
        ) {
            throw new Error(
                "Invalid Paystack webhook payload."
            );
        }

        const webhook =
            payload as Record<
                string,
                unknown
            >;

        const event =
            webhook.event;

        if (
            event !==
            "charge.success"
        ) {
            throw new Error(
                `Unsupported Paystack webhook event: ${String(
                    event
                )}`
            );
        }

        const webhookData =
            webhook.data;

        if (
            !webhookData ||
            typeof webhookData !==
            "object"
        ) {
            throw new Error(
                "Invalid Paystack webhook data."
            );
        }

        const transaction =
            webhookData as Record<
                string,
                unknown
            >;

        const reference =
            transaction.reference;

        if (
            typeof reference !==
            "string" ||
            !reference
        ) {
            throw new Error(
                "Paystack webhook reference is missing."
            );
        }

        const status =
            transaction.status;

        if (
            status !== "success"
        ) {
            throw new Error(
                "Paystack webhook payment was not successful."
            );
        }

        const amount =
            transaction.amount;

        if (
            typeof amount !==
            "number" ||
            !Number.isFinite(amount)
        ) {
            throw new Error(
                "Invalid Paystack webhook amount."
            );
        }

        const normalizedEvent: PaymentEvent =
            "charge.success";

        const normalizedStatus: PaymentStatus =
            "SUCCESS";

        /**
         * Keep provider-specific data inside
         * application-safe metadata.
         *
         * This satisfies IPaymentMetadata while
         * preserving the original transaction
         * information for auditing/reconciliation.
         */
        const metadata: IPaymentMetadata = {
            providerData:
                transaction,
        };

        return {
            event:
                normalizedEvent,

            reference,

            /**
             * Convert kobo to NGN.
             */
            amount:
                amount / 100,

            status:
                normalizedStatus,

            metadata,
        };
    }
}