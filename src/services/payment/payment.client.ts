import axios from "axios";

/**
 * ==========================================
 * ENVIRONMENT VALIDATION
 * ==========================================
 */

const PAYSTACK_SECRET_KEY =
    process.env.PAYSTACK_SECRET_KEY?.trim();

const KORA_SECRET_KEY =
    process.env.KORA_SECRET_KEY?.trim();

const PAYSTACK_BASE_URL =
    process.env.PAYSTACK_BASE_URL?.trim() ||
    "https://api.paystack.co";

const KORA_BASE_URL =
    process.env.KORA_BASE_URL?.trim() ||
    "https://api.korapay.com";

/**
 * ==========================================
 * VALIDATE PAYMENT CONFIGURATION
 * ==========================================
 */

if (!PAYSTACK_SECRET_KEY) {
    throw new Error(
        "PAYSTACK_SECRET_KEY is not configured."
    );
}

if (!KORA_SECRET_KEY) {
    throw new Error(
        "KORA_SECRET_KEY is not configured."
    );
}

/**
 * ==========================================
 * KORA CLIENT
 * ==========================================
 */

export const koraClient = axios.create({
    baseURL: KORA_BASE_URL,

    headers: {
        "Content-Type":
            "application/json",
    },

    timeout: 15000,
});

/**
 * ==========================================
 * PAYSTACK CLIENT
 * ==========================================
 */

export const paystackClient = axios.create({
    baseURL: PAYSTACK_BASE_URL,

    headers: {
        "Content-Type":
            "application/json",
    },

    timeout: 15000,
});

/**
 * ==========================================
 * PAYSTACK AUTHENTICATION
 * ==========================================
 */

paystackClient.interceptors.request.use(
    (config) => {
        config.headers =
            config.headers ?? {};

        config.headers.Authorization =
            `Bearer ${PAYSTACK_SECRET_KEY}`;

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);

/**
 * ==========================================
 * KORA AUTHENTICATION
 * ==========================================
 */

koraClient.interceptors.request.use(
    (config) => {
        config.headers =
            config.headers ?? {};

        config.headers.Authorization =
            `Bearer ${KORA_SECRET_KEY}`;

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);