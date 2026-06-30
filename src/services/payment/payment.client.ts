import axios from "axios";

console.log(
    "PAYSTACK FROM CLIENT:",
    process.env.PAYSTACK_SECRET_KEY
);

console.log(
    "KORA FROM CLIENT:",
    process.env.KORA_SECRET_KEY
);

export const koraClient = axios.create({
    baseURL:
        process.env.KORA_BASE_URL ||
        "https://api.korapay.com",
    headers: {
        "Content-Type": "application/json",
    },
});

export const paystackClient = axios.create({
    baseURL:
        process.env.PAYSTACK_BASE_URL ||
        "https://api.paystack.co",
    headers: {
        "Content-Type": "application/json",
    },
});

paystackClient.interceptors.request.use((config) => {
    console.log(
        "PAYSTACK REQUEST KEY:",
        process.env.PAYSTACK_SECRET_KEY
    );

    config.headers.Authorization =
        `Bearer ${process.env.PAYSTACK_SECRET_KEY}`;

    return config;
});

koraClient.interceptors.request.use((config) => {
    config.headers.Authorization =
        `Bearer ${process.env.KORA_SECRET_KEY}`;

    return config;

});