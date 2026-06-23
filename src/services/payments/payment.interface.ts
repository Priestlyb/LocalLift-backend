import {
    InitializePaymentDto,
    InitializePaymentResponse,
    VerifyPaymentResponse,
    PaymentWebhookPayload,
} from "../../types/payment.types";

export interface PaymentProvider {
    /**
     * Initialize a payment transaction
     */
    initializePayment(
        payload: InitializePaymentDto
    ): Promise<InitializePaymentResponse>;

    /**
     * Verify a payment transaction
     */
    verifyPayment(
        reference: string
    ): Promise<VerifyPaymentResponse>;

    /**
     * Validate and normalize webhook payload
     */
    parseWebhook(
        payload: any,
        signature?: string
    ): Promise<PaymentWebhookPayload>;

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(
        payload: any,
        signature?: string
    ): boolean;
}