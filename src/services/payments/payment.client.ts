import axios from "axios";

export const koraClient = axios.create({
    baseURL:
        process.env.KORA_BASE_URL ||
        "https://api.korapay.com",
    headers: {
        Authorization: `Bearer ${process.env.KORA_SECRET_KEY}`,
        "Content-Type": "application/json",
    },
});

export const paystackClient =
    axios.create({
        baseURL:
            process.env.PAYSTACK_BASE_URL ||
            "https://api.paystack.co",
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
        },
    });