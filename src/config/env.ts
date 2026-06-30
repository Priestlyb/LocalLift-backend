import dotenv from "dotenv";

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",

  PORT: Number(process.env.PORT || 5000),

  JWT_SECRET: process.env.JWT_SECRET || "",

  MONGODB_URI: process.env.MONGODB_URI || "",

  REDIS_URL: process.env.REDIS_URL || "",

  OPENAI_API_KEY:
    process.env.OPENAI_API_KEY || "",

  OPENAI_MODEL:
    process.env.OPENAI_MODEL ||
    "gpt-5-nano",

  PAYSTACK_SECRET_KEY:
    process.env.PAYSTACK_SECRET_KEY || "",

  PAYSTACK_PUBLIC_KEY:
    process.env.PAYSTACK_PUBLIC_KEY || "",

  KORA_SECRET_KEY:
    process.env.KORA_SECRET_KEY || "",

  KORA_PUBLIC_KEY:
    process.env.KORA_PUBLIC_KEY || "",
};

export default env;