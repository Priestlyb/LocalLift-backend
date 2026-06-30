import { Worker } from "bullmq";

import queueConnection from "../config/queue";

import Content from "../models/Content";

import generationService from "../services/ai-tools/generation.service";

const aiWorker = new Worker(
    "ai-generation",

    async (job) => {
        const { contentId } = job.data;

        const content =
            await Content.findById(
                contentId
            );

        if (!content) {
            throw new Error(
                "Content not found."
            );
        }

        try {
            console.log(
                `[AI] Processing ${content._id}`
            );

            const result =
                await generationService.generate({
                    userId:
                        content.user.toString(),

                    businessId:
                        content.business.toString(),

                    type: content.type,

                    details:
                        content.prompt,
                });

            content.generatedContent =
                result.generatedContent ??
                "";

            content.imageUrl =
                result.imageUrl ?? null;

            content.videoUrl =
                result.videoUrl ?? null;

            content.providerId =
                result.providerId ?? null;

            content.metadata = {
                ...(content.metadata || {}),
                generatedAt:
                    new Date(),
            };

            await content.save();

            console.log(
                `[AI] Completed ${content._id}`
            );
        } catch (error) {
            console.error(
                `[AI] Failed ${content._id}`,
                error
            );

            throw error;
        }
    },

    queueConnection
);

aiWorker.on(
    "completed",
    (job) => {
        console.log(
            `[AI] Job ${job.id} completed.`
        );
    }
);

aiWorker.on(
    "failed",
    (job, error) => {
        console.error(
            `[AI] Job ${job?.id} failed: ${error.message}`
        );
    }
);

aiWorker.on(
    "error",
    (error) => {
        console.error(
            "[AI] Worker error:",
            error
        );
    }
);

console.log(
    "[AI] Worker started."
);

export default aiWorker;