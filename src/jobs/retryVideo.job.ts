import Content from "../models/Content";

import {
    addGenerationJob,
} from "../queues/ai.queue";

/**
 * Retries failed video generations.
 */
export const retryFailedVideos =
    async () => {
        const failedVideos =
            await Content.find({
                type: "VIDEO_AD",
                status: "FAILED",
            });

        if (!failedVideos.length) {
            console.log(
                "[VIDEO RETRY] No failed videos found."
            );

            return;
        }

        console.log(
            `[VIDEO RETRY] Retrying ${failedVideos.length} video(s).`
        );

        for (const content of failedVideos) {
            try {
                content.status = "PENDING";
                content.providerId = null;
                content.videoUrl = null;

                await content.save();

                await addGenerationJob(
                    content._id.toString()
                );

                console.log(
                    `[VIDEO RETRY] Queued ${content._id}`
                );
            } catch (error) {
                console.error(
                    `[VIDEO RETRY] Failed to queue ${content._id}`,
                    error
                );
            }
        }
    };

export default retryFailedVideos;