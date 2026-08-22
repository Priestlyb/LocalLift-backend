import {
    InitializePaymentDto,
    InitializePaymentResponse,
    VerifyPaymentResponse,
    VerifiedWebhookPayload,
} from "../../types/payment.types";

export interface PaymentProvider {
    /**
     * Initialize a payment with the provider.
     */
    initializePayment(
        payload: InitializePaymentDto
    ): Promise<InitializePaymentResponse>;

    /**
     * Verify a payment directly with the provider.
     */
    verifyPayment(
        reference: string
    ): Promise<VerifyPaymentResponse>;

    /**
     * Verify and normalize a provider webhook.
     *
     * The returned payload is trusted by the
     * application because the signature has
     * already been verified.
     */
    parseWebhook(
        payload: unknown,
        signature?: string
    ): Promise<VerifiedWebhookPayload>;

    /**
     * Verify provider webhook authenticity.
     */
    verifyWebhookSignature(
        payload: unknown,
        signature?: string
    ): boolean;
}