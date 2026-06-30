import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GenerateImageResponse {
  imageUrl: string;
}

class ImageService {
  /**
   * Generates an image from a fully-built prompt.
   */
  async generate(
    prompt: string
  ): Promise<GenerateImageResponse> {
    const response =
      await openai.images.generate({
        model:
          process.env.OPENAI_IMAGE_MODEL ??
          "gpt-image-1",

        prompt,

        size: "1024x1024",
      });

    const imageBase64 =
      response.data?.[0]?.b64_json;

    if (!imageBase64) {
      throw new Error(
        "Failed to generate image."
      );
    }

    return {
      imageUrl: `data:image/png;base64,${imageBase64}`,
    };
  }
}

export default new ImageService();