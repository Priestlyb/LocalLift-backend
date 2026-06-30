import { PaymentProvider } from "./payment.interface";

import { KoraService } from "./kora.service";
import { PaystackService } from "./paystack.service";

import {
    PaymentProvider as PaymentProviderType,
} from "../../types/payment.types";

export class PaymentService {
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

    
    static getSupportedProviders(): PaymentProviderType[] {
        return [
            "KORA",
            "PAYSTACK",
        ];
    }

    
    static isSupportedProvider(
        provider: string
    ): provider is PaymentProviderType {
        return this.getSupportedProviders().includes(
            provider as PaymentProviderType
        );
    }
}