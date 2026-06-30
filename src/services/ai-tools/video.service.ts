import axios from "axios";

const lumaUrl =
  process.env.LUMA_API_URL;

if (!lumaUrl) {
  throw new Error(
    "LUMA_API_URL is missing."
  );
}

const lumaApiKey =
  process.env.LUMA_API_KEY;

if (!lumaApiKey) {
  throw new Error(
    "LUMA_API_KEY is missing."
  );
}

/**
 * These are now guaranteed strings.
 */
const LUMA_URL: string =
  lumaUrl;

const LUMA_API_KEY: string =
  lumaApiKey;

export interface GenerateVideoResponse {
  videoUrl: string;
  providerId: string;
}

const sleep = (ms: number) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

class VideoService {
  private readonly maxAttempts =
    60;

  private readonly pollInterval =
    5000;

  /**
   * Generates a video from a prompt.
   */
  async generate(
    prompt: string
  ): Promise<GenerateVideoResponse> {
    const createResponse =
      await axios.post(
        LUMA_URL,
        {
          prompt,
        },
        {
          headers: {
            Authorization: `Bearer ${LUMA_API_KEY}`,
            "Content-Type":
              "application/json",
          },
        }
      );

    const generationId =
      createResponse.data?.id;

    if (!generationId) {
      throw new Error(
        "Failed to create video generation."
      );
    }

    return this.waitForCompletion(
      generationId
    );
  }

  /**
   * Polls Luma until generation completes.
   */
  private async waitForCompletion(
    generationId: string
  ): Promise<GenerateVideoResponse> {
    let attempts = 0;

    while (
      attempts <
      this.maxAttempts
    ) {
      await sleep(
        this.pollInterval
      );

      const response =
        await axios.get(
          `${LUMA_URL}/${generationId}`,
          {
            headers: {
              Authorization: `Bearer ${LUMA_API_KEY}`,
            },
          }
        );

      const generation =
        response.data;

      switch (
        generation.state
      ) {
        case "completed": {
          const videoUrl =
            generation.assets
              ?.video;

          if (!videoUrl) {
            throw new Error(
              "Video completed but URL is missing."
            );
          }

          return {
            videoUrl,
            providerId:
              generationId,
          };
        }

        case "failed":
          throw new Error(
            "Video generation failed."
          );

        default:
          attempts++;
      }
    }

    throw new Error(
      "Video generation timed out."
    );
  }
}

export default new VideoService();