import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class TextService {
  /**
   * Generates text from an AI prompt.
   */
  async generate(
    prompt: string
  ): Promise<string> {
    const response =
      await openai.responses.create({
        model:
          process.env.OPENAI_MODEL ??
          "gpt-4.1-mini",

        input: prompt,
      });

    return response.output_text;
  }

  /**
   * Generates JSON output.
   */
  async generateJson<T>(
    prompt: string
  ): Promise<T> {
    const response =
      await openai.responses.create({
        model:
          process.env.OPENAI_MODEL ??
          "gpt-4.1-mini",

        input: prompt,

        text: {
          format: {
            type: "json_object",
          },
        },
      });

    return JSON.parse(
      response.output_text
    ) as T;
  }

  /**
   * Generates a short title.
   */
  async generateTitle(
    prompt: string
  ) {
    return this.generate(
      `${prompt}

Generate a short title only.
Maximum 8 words.`
    );
  }

  /**
   * Generates hashtags.
   */
  async generateHashtags(
    prompt: string
  ) {
    return this.generate(
      `${prompt}

Generate only 10 relevant hashtags.`
    );
  }
}

export default new TextService();