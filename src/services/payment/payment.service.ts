import { PaymentProvider } from "./payment.interface";

import { KoraService } from "./kora.service";
import { PaystackService } from "./paystack.service";

import {
    PaymentProvider as PaymentProviderType,
} from "../../types/payment.types";

/**
 * Central payment-provider service.
 *
 * Security principles:
 *
 * - Only explicitly supported providers can be used.
 * - Provider names are validated before instantiation.
 * - Provider instances are created internally.
 * - No client-controlled provider class/module can
 *   ever be loaded dynamically.
 */
export class PaymentService {
    /**
     * ==========================================
     * SUPPORTED PROVIDERS
     * ==========================================
     */

    private static readonly SUPPORTED_PROVIDERS:
        readonly PaymentProviderType[] = [
            "KORA",
            "PAYSTACK",
        ];

    /**
     * ==========================================
     * GET PAYMENT PROVIDER
     * ==========================================
     *
     * Only providers explicitly registered above
     * can be instantiated.
     */
    static getProvider(
        provider: PaymentProviderType
    ): PaymentProvider {
        if (
            !PaymentService.isSupportedProvider(
                provider
            )
        ) {
            throw new Error(
                "Unsupported payment provider"
            );
        }

        switch (provider) {
            case "KORA":
                return new KoraService();

            case "PAYSTACK":
                return new PaystackService();

            /**
             * This branch is technically unreachable
             * because PaymentProviderType is a
             * restricted union.
             *
             * It remains as a runtime safeguard.
             */
            default:
                throw new Error(
                    "Unsupported payment provider"
                );
        }
    }

    /**
     * ==========================================
     * GET SUPPORTED PROVIDERS
     * ==========================================
     *
     * Return a copy so callers cannot mutate
     * the internal provider registry.
     */
    static getSupportedProviders():
        PaymentProviderType[] {
        return [
            ...PaymentService.SUPPORTED_PROVIDERS,
        ];
    }

    /**
     * ==========================================
     * CHECK SUPPORTED PROVIDER
     * ==========================================
     *
     * Runtime type guard for values received
     * from HTTP requests.
     */
    static isSupportedProvider(
        provider: unknown
    ): provider is PaymentProviderType {
        if (
            typeof provider !==
            "string"
        ) {
            return false;
        }

        return (
            PaymentService.SUPPORTED_PROVIDERS.includes(
                provider as PaymentProviderType
            )
        );
    }

    /**
     * ==========================================
     * NORMALIZE PROVIDER
     * ==========================================
     *
     * Useful when accepting provider names from
     * HTTP request bodies.
     *
     * Example:
     *
     * "paystack" -> "PAYSTACK"
     *
     * Invalid values return null.
     */
    static normalizeProvider(
        provider: unknown
    ): PaymentProviderType | null {
        if (
            typeof provider !==
            "string"
        ) {
            return null;
        }

        const normalized =
            provider
                .trim()
                .toUpperCase();

        if (
            PaymentService.isSupportedProvider(
                normalized
            )
        ) {
            return normalized;
        }

        return null;
    }
}

export default PaymentService;