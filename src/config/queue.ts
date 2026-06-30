import IORedis from "ioredis";

const REDIS_URL =
  process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error(
    "REDIS_URL is missing."
  );
}

/**
 * Shared Redis connection for BullMQ.
 */
export const redisConnection =
  new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

/**
 * Shared BullMQ connection options.
 */
export const queueConnection = {
  connection: redisConnection,
};

export default queueConnection;