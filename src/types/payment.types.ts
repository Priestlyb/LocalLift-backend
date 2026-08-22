/**
 * ==========================================
 * PAYMENT PROVIDER
 * ==========================================
 */

export type PaymentProvider =
    | "KORA"
    | "PAYSTACK";

/**
 * ==========================================
 * PAYMENT PLAN
 * ==========================================
 */

export type PaymentPlan =
    | "FREE"
    | "STARTER"
    | "GROWTH"
    | "PRO";

/**
 * ==========================================
 * PAYMENT STATUS
 * ==========================================
 */

export type PaymentStatus =
    | "PENDING"
    | "SUCCESS"
    | "FAILED"
    | "CANCELLED";

/**
 * ==========================================
 * PAYMENT EVENTS
 * ==========================================
 *
 * Only events explicitly supported by the
 * application should be accepted after
 * webhook verification.
 */

export type PaymentEvent =
    | "charge.success"
    | "payment.success";

/**
 * ==========================================
 * PAYMENT METADATA
 * ==========================================
 *
 * Metadata may contain application-level
 * identifiers required for reconciliation.
 *
 * NEVER store:
 *
 * - passwords
 * - JWTs
 * - API keys
 * - provider secret keys
 * - OTPs
 * - transaction PINs
 * - card information
 * - bank credentials
 */

export interface IPaymentMetadata {
    userId?: string;

    plan?: PaymentPlan;

    paymentId?: string;

    transactionId?: string;

    orderId?: string;

    [key: string]: unknown;
}

/**
 * ==========================================
 * INITIALIZE PAYMENT
 * ==========================================
 */

export interface InitializePaymentDto {
    /**
     * User email associated with the payment.
     */
    email: string;

    /**
     * Amount in the application's base
     * currency unit.
     *
     * Example:
     *
     * NGN 6,000 => 6000
     *
     * Provider-specific conversion should
     * happen inside the provider service.
     */
    amount: number;

    /**
     * Server-generated unique payment reference.
     */
    reference: string;

    /**
     * Provider callback/redirect URL.
     */
    callbackUrl?: string;

    /**
     * Safe application metadata only.
     */
    metadata?: IPaymentMetadata;
}

/**
 * ==========================================
 * INITIALIZE PAYMENT RESPONSE
 * ==========================================
 */

export interface InitializePaymentResponse {
    /**
     * URL where the customer completes payment.
     */
    authorizationUrl: string;

    /**
     * Server-generated payment reference.
     */
    reference: string;
}

/**
 * ==========================================
 * VERIFY PAYMENT RESPONSE
 * ==========================================
 */

export interface VerifyPaymentResponse {
    /**
     * Whether the provider verification request
     * itself succeeded.
     *
     * This does not necessarily mean the payment
     * was successful. Always inspect `status`.
     */
    success: boolean;

    /**
     * Payment reference returned by the provider.
     */
    reference: string;

    /**
     * Amount confirmed by the provider.
     *
     * Provider services must normalize this
     * into the application's base currency unit.
     */
    amount: number;

    /**
     * Provider payment status.
     */
    status: string;

    /**
     * Provider-confirmed payment timestamp.
     */
    paidAt?: Date | string | null;

    /**
     * Raw provider response.
     *
     * This must never be returned directly to
     * untrusted clients if it contains sensitive
     * provider information.
     */
    providerResponse?: unknown;
}

/**
 * ==========================================
 * VERIFIED WEBHOOK PAYLOAD
 * ==========================================
 *
 * IMPORTANT:
 *
 * This represents a webhook AFTER:
 *
 * 1. Raw body has been received.
 * 2. Provider signature has been verified.
 * 3. Required fields have been validated.
 * 4. Provider-specific values have been
 *    normalized into application values.
 *
 * Only this structure should enter the
 * application's payment-processing layer.
 */

export interface VerifiedWebhookPayload {
    /**
     * Application-supported payment event.
     */
    event: PaymentEvent;

    /**
     * Provider payment reference.
     */
    reference: string;

    /**
     * Provider-confirmed amount in the
     * application's base currency unit.
     */
    amount: number;

    /**
     * Normalized application payment status.
     */
    status: PaymentStatus;

    /**
     * Safe application metadata.
     */
    metadata?: IPaymentMetadata;
}

/**
 * ==========================================
 * PAYMENT RECORD
 * ==========================================
 */

export interface PaymentRecord {
    user: string;

    provider: PaymentProvider;

    reference: string;

    plan: PaymentPlan;

    amount: number;

    status: PaymentStatus;

    paidAt?: Date;
}

/**
 * ==========================================
 * PAYMENT PROVIDER CONFIGURATION
 * ==========================================
 */

export interface PaymentProviderConfig {
    /**
     * Private provider API key.
     *
     * NEVER expose this to the client.
     */
    secretKey: string;

    /**
     * Public provider key.
     *
     * Optional because not every provider
     * requires one.
     */
    publicKey?: string;

    /**
     * Webhook signing secret.
     *
     * NEVER expose this to the client.
     */
    webhookSecret?: string;
}

/**
 * ==========================================
 * SUBSCRIPTION UPGRADE PAYLOAD
 * ==========================================
 */

export interface SubscriptionUpgradePayload {
    userId: string;

    plan: PaymentPlan;

    reference: string;

    provider: PaymentProvider;
}