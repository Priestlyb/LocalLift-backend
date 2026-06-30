import {
    IScheduledPost,
} from "../../models/ScheduledPost";

import {
    schedulerQueue,
} from "../../queues/scheduler.queue";

class QueueService {
    /**
     * Adds a scheduled post to the queue.
     */
    async schedulePost(
        post: IScheduledPost
    ) {
        if (!schedulerQueue) {
            throw new Error(
                "Scheduler queue not initialized."
            );
        }

        const delay = Math.max(
            0,
            post.scheduledFor.getTime() -
            Date.now()
        );

        return schedulerQueue.add(
            "publish-post",
            {
                scheduledPostId:
                    post._id.toString(),
            },
            {
                jobId: post._id.toString(),

                delay,

                removeOnComplete: 100,

                removeOnFail: 100,
            }
        );
    }

    /**
     * Reschedules an existing job.
     */
    async reschedulePost(
        post: IScheduledPost
    ) {
        await this.cancelPost(
            post._id.toString()
        );

        return this.schedulePost(post);
    }

    /**
     * Removes a scheduled job.
     */
    async cancelPost(
        scheduledPostId: string
    ) {
        if (!schedulerQueue) {
            return;
        }

        const job =
            await schedulerQueue.getJob(
                scheduledPostId
            );

        if (!job) {
            return;
        }

        await job.remove();
    }

    /**
     * Retries a failed job.
     */
    async retryPost(
        scheduledPostId: string
    ) {
        if (!schedulerQueue) {
            throw new Error(
                "Scheduler queue not initialized."
            );
        }

        const job =
            await schedulerQueue.getJob(
                scheduledPostId
            );

        if (!job) {
            return;
        }

        await job.retry();
    }

    /**
     * Returns a queued job.
     */
    async getJob(
        scheduledPostId: string
    ) {
        if (!schedulerQueue) {
            return null;
        }

        return schedulerQueue.getJob(
            scheduledPostId
        );
    }

    /**
     * Returns whether a job exists.
     */
    async jobExists(
        scheduledPostId: string
    ): Promise<boolean> {
        if (!schedulerQueue) {
            return false;
        }

        const job =
            await schedulerQueue.getJob(
                scheduledPostId
            );

        return !!job;
    }
}

export default new QueueService();