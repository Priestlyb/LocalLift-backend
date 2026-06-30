import ScheduledPost from "../models/ScheduledPost";
import queueService from "../services/scheduler/queue.service";

/**
 * Periodically scans for scheduled posts that
 * should exist in the queue but don't.
 *
 * This helps recover jobs after:
 * - Server restarts
 * - Redis restarts
 * - Queue failures
 */
export const syncSchedulerQueue =
  async () => {
    const now = new Date();

    const posts =
      await ScheduledPost.find({
        status: "PENDING",

        isDeleted: false,

        scheduledFor: {
          $gte: now,
        },
      });

    let queued = 0;

    for (const post of posts) {
      const exists =
        await queueService.jobExists(
          post._id.toString()
        );

      if (!exists) {
        await queueService.schedulePost(
          post
        );

        queued++;
      }
    }

    console.log(
      `[SCHEDULER JOB] Re-queued ${queued} scheduled post(s).`
    );
  };

/**
 * Retries failed scheduled posts
 * that haven't exceeded the retry limit.
 */
export const retryFailedSchedules =
  async () => {
    const failedPosts =
      await ScheduledPost.find({
        status: "FAILED",

        isDeleted: false,

        retryCount: {
          $lt: 3,
        },
      });

    let retried = 0;

    for (const post of failedPosts) {
      await queueService.schedulePost(
        post
      );

      retried++;
    }

    console.log(
      `[SCHEDULER JOB] Retried ${retried} failed schedule(s).`
    );
  };

/**
 * Removes old published schedules.
 *
 * This can be run weekly or monthly.
 */
export const cleanupPublishedSchedules =
  async () => {
    const cutoff = new Date();

    cutoff.setMonth(
      cutoff.getMonth() - 3
    );

    const result =
      await ScheduledPost.deleteMany({
        status: "PUBLISHED",

        publishedAt: {
          $lt: cutoff,
        },
      });

    console.log(
      `[SCHEDULER JOB] Removed ${result.deletedCount} old schedules.`
    );
  };