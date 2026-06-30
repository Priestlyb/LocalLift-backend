import { Worker } from "bullmq";

import { redis } from "../config/redis";

import ScheduledPost from "../models/ScheduledPost";

import schedulerService from "../services/scheduler/scheduler.service";
import publisherService from "../services/scheduler/publisher.service";

export const schedulerWorker = redis
  ? new Worker(
      "scheduler",

      async (job) => {
        const { scheduledPostId } =
          job.data;

        const post =
          await ScheduledPost.findById(
            scheduledPostId
          );

        if (!post) {
          throw new Error(
            "Scheduled post not found."
          );
        }

        if (
          post.status === "CANCELLED" ||
          post.isDeleted
        ) {
          console.log(
            `[SCHEDULER] Skipping ${post._id}.`
          );

          return;
        }

        try {
          await schedulerService.markProcessing(
            post._id.toString()
          );

          const results =
            await publisherService.publish(
              post
            );

          const failed =
            results.filter(
              (result) =>
                !result.success
            );

          if (failed.length > 0) {
            throw new Error(
              failed
                .map(
                  (result) =>
                    `${result.platform}: ${result.error}`
                )
                .join(", ")
            );
          }

          await schedulerService.markPublished(
            post._id.toString()
          );

          console.log(
            `[SCHEDULER] Published ${post._id}`
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unknown publishing error.";

          await schedulerService.markFailed(
            post._id.toString(),
            message
          );

          console.error(
            `[SCHEDULER] Failed ${post._id}: ${message}`
          );

          throw error;
        }
      },

      {
        connection: redis,
      }
    )
  : null;

if (!schedulerWorker) {
  console.log(
    "Scheduler worker disabled (Redis not available)"
  );
}

schedulerWorker?.on(
  "completed",
  (job) => {
    console.log(
      `[SCHEDULER] Job ${job.id} completed.`
    );
  }
);

schedulerWorker?.on(
  "failed",
  (job, error) => {
    console.error(
      `[SCHEDULER] Job ${job?.id} failed: ${error.message}`
    );
  }
);

export default schedulerWorker;