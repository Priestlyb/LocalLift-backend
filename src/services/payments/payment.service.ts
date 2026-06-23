import { PaymentProvider } from "./payment.interface";

import { KoraService } from "./kora.service";
import { PaystackService } from "./paystack.service";

import {
    PaymentProvider as PaymentProviderType,
} from "../../types/payment.types";

export class PaymentService {
    /**
     * Returns the appropriate payment provider
     */
    static getProvider(
        provider: PaymentProviderType
    ): PaymentProvider {
        switch (provider) {
            case "KORA":
                return new KoraService();

            case "PAYSTACK":
                return new PaystackService();

            default:
                throw new Error(
                    `Unsupported payment provider: ${provider}`
                );
        }
    }

    /**
     * Returns all supported providers
     */
    static getSupportedProviders(): PaymentProviderType[] {
        return [
            "KORA",
            "PAYSTACK",
        ];
    }

    /**
     * Check if provider is supported
     */
    static isSupportedProvider(
        provider: string
    ): provider is PaymentProviderType {
        return this.getSupportedProviders().includes(
            provider as PaymentProviderType
        );
    }
}