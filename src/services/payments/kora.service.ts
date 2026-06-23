import crypto from "crypto";

import { PaymentProvider } from "./payment.interface";

import {
    InitializePaymentDto,
    InitializePaymentResponse,
    VerifyPaymentResponse,
    PaymentWebhookPayload,
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
                    amount: payload.amount,
                    currency: "NGN",
                    reference:
                        payload.reference,
                    customer: {
                        email:
                            payload.email,
                    },
                    redirect_url:
                        payload.callbackUrl,
                }
            );

        return {
            authorizationUrl:
                response.data.data
                    ?.checkout_url,
            reference:
                payload.reference,
        };
    }

    async verifyPayment(
        reference: string
    ): Promise<VerifyPaymentResponse> {
        const response =
            await koraClient.get(
                `/merchant/api/v1/transactions/${reference}`
            );

        const data =
            response.data.data;

        return {
            success:
                data?.status ===
                "success",

            reference,

            amount:
                data?.amount || 0,

            status:
                data?.status,

            paidAt:
                data?.created_at,

            providerResponse:
                data,
        };
    }

    verifyWebhookSignature(
        payload: any,
        signature?: string
    ): boolean {
        if (!signature) {
            return false;
        }

        const hash = crypto
            .createHmac(
                "sha256",
                process.env
                    .KORA_WEBHOOK_SECRET!
            )
            .update(
                JSON.stringify(
                    payload
                )
            )
            .digest("hex");

        return hash === signature;
    }

    async parseWebhook(
        payload: any,
        signature?: string
    ): Promise<PaymentWebhookPayload> {
        const isValid =
            this.verifyWebhookSignature(
                payload,
                signature
            );

        if (!isValid) {
            throw new Error(
                "Invalid webhook signature"
            );
        }

        return {
            event:
                payload.event ||
                "charge.success",

            reference:
                payload.data
                    ?.reference ||
                payload.data
                    ?.transactionReference,

            amount:
                payload.data
                    ?.amount || 0,

            status:
                payload.data
                    ?.status ||
                "success",

            metadata:
                payload.data,
        };
    }
}