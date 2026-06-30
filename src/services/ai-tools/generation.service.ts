import Business from "../../models/Business";
import Content, {
    IContent,
} from "../../models/Content";
import Subscription from "../../models/Subscription";

import promptService from "./prompt.service";
import textService from "./text.service";
import imageService from "./image.service";
import videoService from "./video.service";

import featureService from "../subscription/feature.service";
import entitlementService from "../subscription/entitlement.service";

import usageService from "../subscription/usage.service";

import {
    PlanKey,
} from "../../types/subscription.types";

export interface GenerateContentOptions {
    userId: string;

    businessId: string;

    type:
    | "SOCIAL_POST"
    | "PROMOTION"
    | "PRODUCT_DESCRIPTION"
    | "IMAGE_POSTER"
    | "VIDEO_AD";

    details: string;

    productName?: string;

    platform?: string;

    tone?: string;

    audience?: string;
}

class GenerationService {
    /**
     * Generates AI content and stores it.
     */
    async generate(
        options: GenerateContentOptions
    ): Promise<IContent> {
        /**
         * Ensure the business belongs to
         * the authenticated user.
         */
        const business =
            await Business.findOne({
                _id: options.businessId,
                owner: options.userId,
            });

        if (!business) {
            throw new Error(
                "Business not found."
            );
        }

        /**
         * Every registered user should
         * already have a subscription.
         */
        const subscription =
            await Subscription.findOne({
                user: options.userId,
            });

        if (!subscription) {
            throw new Error(
                "Subscription not found."
            );
        }

        if (
            !entitlementService.isValidPlan(
                subscription.plan
            )
        ) {
            throw new Error(
                "Invalid subscription plan."
            );
        }

        const plan =
            subscription.plan as PlanKey;

        const usage =
            await usageService.getOrCreateUsage(
                options.userId
            );

        /**
         * Image generations are limited
         * by the user's subscription.
         */
        if (
            options.type ===
            "IMAGE_POSTER" &&
            !featureService.canGenerateImage({
                plan,
                status:
                    subscription.status,
                usedImages:
                    usage.imageGenerationsUsed,
            })
        ) {
            throw new Error(
                "Image generation limit reached."
            );
        }

        const prompt =
            promptService.buildPrompt({
                type: options.type,

                business,

                details:
                    options.details,

                productName:
                    options.productName,

                platform:
                    options.platform,

                tone:
                    options.tone,

                audience:
                    options.audience,
            });

        let generatedContent = "";

        let imageUrl:
            | string
            | undefined;

        let videoUrl:
            | string
            | undefined;

        let providerId:
            | string
            | undefined;

        switch (options.type) {
            case "SOCIAL_POST":
            case "PROMOTION":
            case "PRODUCT_DESCRIPTION":
                generatedContent =
                    await textService.generate(
                        prompt
                    );
                break;

            case "IMAGE_POSTER": {
                const image =
                    await imageService.generate(
                        prompt
                    );

                imageUrl =
                    image.imageUrl;

                /**
                 * Only count successful
                 * image generations.
                 */
                await usageService.incrementImageUsage(
                    options.userId
                );

                break;
            }

            case "VIDEO_AD": {
                const video =
                    await videoService.generate(
                        prompt
                    );

                videoUrl =
                    video.videoUrl;

                providerId =
                    video.providerId;

                break;
            }

            default:
                throw new Error(
                    "Unsupported content type."
                );
        }

        return await Content.create({
            user: options.userId,

            business:
                business._id,

            type: options.type,

            prompt,

            generatedContent,

            imageUrl,

            videoUrl,

            providerId,
        });
    }
}

export default new GenerationService();