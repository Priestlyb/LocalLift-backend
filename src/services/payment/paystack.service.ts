import crypto from "crypto";

import { PaymentProvider } from "./payment.interface";

import {
    InitializePaymentDto,
    InitializePaymentResponse,
    VerifyPaymentResponse,
    PaymentWebhookPayload,
} from "../../types/payment.types";

import { paystackClient } from "./payment.client";

export class PaystackService
    implements PaymentProvider {
    async initializePayment(
        payload: InitializePaymentDto
    ): Promise<InitializePaymentResponse> {
        try {
            console.log("PAYSTACK PAYLOAD", {
                email: payload.email,
                amount: payload.amount * 100,
                reference: payload.reference,
                callback_url: payload.callbackUrl,
                metadata: payload.metadata,
            });

            const response = await paystackClient.post(
                "/transaction/initialize",
                {
                    email: payload.email,
                    amount: payload.amount * 100,
                    reference: payload.reference,
                    callback_url: payload.callbackUrl,
                    metadata: payload.metadata,
                }
            );

            console.log("PAYSTACK RESPONSE", response.data);

            return {
                authorizationUrl:
                    response.data.data.authorization_url,
                reference: payload.reference,
            };
        } catch (error: any) {
            console.error("PAYSTACK STATUS:", error.response?.status);
            console.error("PAYSTACK DATA:", error.response?.data);
            console.error("PAYSTACK MESSAGE:", error.message);

            throw error;
        }
    }

    async verifyPayment(
        reference: string
    ): Promise<VerifyPaymentResponse> {
        const response =
            await paystackClient.get(
                `/transaction/verify/${reference}`
            );

        const data =
            response.data.data;

        return {
            success:
                data.status ===
                "success",

            reference,

            amount:
                data.amount / 100,

            status:
                data.status,

            paidAt:
                data.paid_at,

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
                "sha512",
                process.env
                    .PAYSTACK_SECRET_KEY!
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
                payload.event,

            reference:
                payload.data
                    ?.reference,

            amount:
                payload.data
                    ?.amount || 0,

            status:
                payload.data
                    ?.status,

            metadata:
                payload.data,
        };
    }
}