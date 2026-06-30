import {
    InitializePaymentDto,
    InitializePaymentResponse,
    VerifyPaymentResponse,
    PaymentWebhookPayload,
} from "../../types/payment.types";

export interface PaymentProvider {

    initializePayment(
        payload: InitializePaymentDto
    ): Promise<InitializePaymentResponse>;

    verifyPayment(
        reference: string
    ): Promise<VerifyPaymentResponse>;

    parseWebhook(
        payload: any,
        signature?: string
    ): Promise<PaymentWebhookPayload>;

    verifyWebhookSignature(
        payload: any,
        signature?: string
    ): boolean;
}