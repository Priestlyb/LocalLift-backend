import OpenAI from "openai";

import env from "../config/env";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export interface CaptionOptions {
  businessName: string;
  category: string;
  prompt: string;
  tone?:
    | "professional"
    | "friendly"
    | "luxury"
    | "fun"
    | "bold";

  includeHashtags?: boolean;

  maxLength?: number;
}

export interface CaptionResult {
  caption: string;
  hashtags: string[];
}

class CaptionService {
  /**
   * Generates an AI-powered caption for
   * a business post.
   */
  async generateCaption(
    options: CaptionOptions
  ): Promise<CaptionResult> {
    const {
      businessName,
      category,
      prompt,
      tone = "friendly",
      includeHashtags = true,
      maxLength = 300,
    } = options;

    const completion =
      await openai.chat.completions.create({
        model: "gpt-5-nano",

        messages: [
          {
            role: "system",
            content: `
You are a professional social media marketer.

Generate engaging captions for businesses.

Rules:
- Keep within ${maxLength} characters.
- Tone: ${tone}
- Do not use emojis unless appropriate.
- Return hashtags separately.
            `,
          },
          {
            role: "user",
            content: `
Business: ${businessName}

Category: ${category}

Description:

${prompt}
            `,
          },
        ],

        response_format: {
          type: "json_object",
        },
      });

    const raw =
      completion.choices[0].message.content;

    if (!raw) {
      throw new Error(
        "Failed to generate caption."
      );
    }

    const parsed = JSON.parse(raw);

    return {
      caption: parsed.caption,
      hashtags:
        includeHashtags
          ? parsed.hashtags ?? []
          : [],
    };
  }
}

export default new CaptionService();