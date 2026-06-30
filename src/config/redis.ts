import { Redis } from "ioredis";

export let redis: Redis | null = null;

if (process.env.REDIS_URL) {
    try {
        redis = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: null,
            retryStrategy(times) {
                if (times > 3) return null;
                return 2000;
            },
        });

        redis.on("connect", () => {
            console.log("✅ Redis connected");
        });

        redis.on("ready", () => {
            console.log("✅ Redis ready");
        });

        redis.on("error", (err) => {
            console.log("❌ Redis error:", err.message);
        });
    } catch (err) {
        console.log("❌ Redis failed to initialize");
        redis = null;
    }
} else {
    console.log("❌ REDIS_URL not set");
}