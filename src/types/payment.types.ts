export type PaymentProvider =
    | "KORA"
    | "PAYSTACK";

export type PaymentPlan =
    | "FREE"
    | "STARTER"
    | "GROWTH"
    | "PRO";

export type PaymentStatus =
    | "PENDING"
    | "SUCCESS"
    | "FAILED"
    | "CANCELLED";

export interface InitializePaymentDto {
    email: string;
    amount: number;
    reference: string;
    callbackUrl?: string;
    metadata?: Record<string, any>;
}

export interface InitializePaymentResponse {
    authorizationUrl: string;
    reference: string;
}

export interface VerifyPaymentResponse {
    success: boolean;
    reference: string;
    amount: number;
    status: string;
    paidAt?: Date | string | null;
    providerResponse?: any;
}

export interface PaymentWebhookPayload {
    event: string;
    reference: string;
    amount: number;
    status: string;
    metadata?: Record<string, any>;
}

export interface PaymentRecord {
    user: string;
    provider: PaymentProvider;
    reference: string;
    plan: PaymentPlan;
    amount: number;
    status: PaymentStatus;
    paidAt?: Date;
}

export interface PaymentProviderConfig {
    secretKey: string;
    publicKey?: string;
    webhookSecret?: string;
}

export interface SubscriptionUpgradePayload {
    userId: string;
    plan: PaymentPlan;
    reference: string;
    provider: PaymentProvider;
}