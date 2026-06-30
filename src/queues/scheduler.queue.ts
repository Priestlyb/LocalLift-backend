import { Queue } from "bullmq";

import { redis } from "../config/redis";

export const schedulerQueue = redis
  ? new Queue("scheduler", {
      connection: redis,

      defaultJobOptions: {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 5000,
        },

        removeOnComplete: 100,

        removeOnFail: 100,
      },
    })
  : null;

if (!schedulerQueue) {
  console.log(
    "Scheduler queue disabled (Redis not available)"
  );
}