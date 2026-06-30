import Business, {
    IBusiness,
} from "../../models/Business";

export interface PromptOptions {
    type:
    | "SOCIAL_POST"
    | "PROMOTION"
    | "PRODUCT_DESCRIPTION"
    | "IMAGE_POSTER"
    | "VIDEO_AD";

    business: IBusiness;

    details: string;

    productName?: string;

    tone?: string;

    audience?: string;

    platform?: string;

    additionalInstructions?: string;
}

class PromptService {
    /**
     * Builds the final prompt used by the AI.
     */
    buildPrompt(
        options: PromptOptions
    ): string {
        switch (options.type) {
            case "SOCIAL_POST":
                return this.buildSocialPostPrompt(
                    options
                );

            case "PROMOTION":
                return this.buildPromotionPrompt(
                    options
                );

            case "PRODUCT_DESCRIPTION":
                return this.buildProductDescriptionPrompt(
                    options
                );

            case "IMAGE_POSTER":
                return this.buildImagePrompt(
                    options
                );

            case "VIDEO_AD":
                return this.buildVideoPrompt(
                    options
                );

            default:
                throw new Error(
                    "Unsupported content type."
                );
        }
    }

    /**
     * Shared business context.
     */
    private getBusinessContext(
        business: IBusiness
    ) {
        return `
Business Name: ${business.businessName}
Category: ${business.category}
Description: ${business.description}
Target Audience: ${business.targetAudience}
Unique Selling Point: ${business.uniqueSellingPoint}
Brand Voice: ${business.brandVoice}
Website: ${business.website}
Location: ${business.city}, ${business.state}, ${business.country}
`;
    }

    /**
     * Social media prompt.
     */
    private buildSocialPostPrompt(
        options: PromptOptions
    ) {
        return `
You are an expert social media marketer.

${this.getBusinessContext(
            options.business
        )}

Create an engaging social media post.

Platform:
${options.platform ?? "General"}

Tone:
${options.tone ?? options.business.brandVoice}

Audience:
${options.audience ?? options.business.targetAudience}

Topic:
${options.details}

Requirements:

- Attention grabbing opening
- Clear message
- Natural language
- Include relevant emojis where appropriate
- End with a call to action
- Include suitable hashtags

${options.additionalInstructions ?? ""}
`;
    }

    /**
     * Promotional campaign prompt.
     */
    private buildPromotionPrompt(
        options: PromptOptions
    ) {
        return `
You are an experienced digital marketer.

${this.getBusinessContext(
            options.business
        )}

Create a promotional campaign.

Product:
${options.productName ?? "Business"}

Promotion Details:
${options.details}

Tone:
${options.tone ?? options.business.brandVoice}

Requirements:

- Focus on value
- Highlight benefits
- Create urgency where appropriate
- Strong call to action
- Suitable for social media
`;
    }

    /**
     * Product description prompt.
     */
    private buildProductDescriptionPrompt(
        options: PromptOptions
    ) {
        return `
You are an ecommerce copywriter.

${this.getBusinessContext(
            options.business
        )}

Write a professional product description.

Product:
${options.productName}

Details:
${options.details}

Requirements:

- SEO friendly
- Customer focused
- Benefit driven
- Professional
- Easy to read
`;
    }

    /**
     * Image generation prompt.
     */
    private buildImagePrompt(
        options: PromptOptions
    ) {
        return `
Create a premium marketing poster.

Business:
${options.business.businessName}

Category:
${options.business.category}

Brand Style:
${options.business.brandVoice}

Description:
${options.details}

Requirements:

- Modern
- High quality
- Professional lighting
- Marketing focused
- Eye-catching composition
- Suitable for social media
- No watermarks
`;
    }

    /**
     * Video generation prompt.
     */
    private buildVideoPrompt(
        options: PromptOptions
    ) {
        return `
Create a cinematic marketing advertisement.

Business:
${options.business.businessName}

Category:
${options.business.category}

Product:
${options.productName ?? "Business"}

Description:
${options.details}

Requirements:

- Realistic
- Professional
- Dynamic camera movement
- Premium lighting
- Modern commercial style
- Suitable for advertising
`;
    }

    /**
     * Convenience helper.
     */
    async buildPromptFromBusiness(
        ownerId: string,
        options: Omit<
            PromptOptions,
            "business"
        >
    ) {
        const business =
            await Business.findOne({
                owner: ownerId,
            });

        if (!business) {
            throw new Error(
                "Business not found."
            );
        }

        return this.buildPrompt({
            ...options,
            business,
        });
    }
}

export default new PromptService();