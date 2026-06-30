import { Queue } from "bullmq";

import { redis } from "../config/redis";

export const aiQueue = redis
  ? new Queue("ai-generation", {
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

if (!aiQueue) {
  console.log(
    "AI queue disabled (Redis not available)."
  );
}

/**
 * Queue a content generation job.
 */
export const addGenerationJob = async (
  contentId: string
) => {
  if (!aiQueue) {
    throw new Error(
      "AI queue is not initialized."
    );
  }

  return aiQueue.add(
    "generate-content",
    {
      contentId,
    },
    {
      jobId: contentId,
    }
  );
};

/**
 * Queue a regeneration job.
 */
export const addRegenerationJob =
  async (contentId: string) => {
    if (!aiQueue) {
      throw new Error(
        "AI queue is not initialized."
      );
    }

    return aiQueue.add(
      "regenerate-content",
      {
        contentId,
      },
      {
        jobId: `regen-${contentId}-${Date.now()}`,
      }
    );
  };

/**
 * Queue an image upscaling job.
 */
export const addUpscaleJob = async (
  contentId: string
) => {
  if (!aiQueue) {
    throw new Error(
      "AI queue is not initialized."
    );
  }

  return aiQueue.add(
    "upscale-image",
    {
      contentId,
    }
  );
};

/**
 * Queue a watermark removal job.
 */
export const addWatermarkRemovalJob =
  async (contentId: string) => {
    if (!aiQueue) {
      throw new Error(
        "AI queue is not initialized."
      );
    }

    return aiQueue.add(
      "remove-watermark",
      {
        contentId,
      }
    );
  };