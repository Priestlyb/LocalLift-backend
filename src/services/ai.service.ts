import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log("OPENAI KEY:", process.env.OPENAI_API_KEY);

export const generateAIContent = async (
  type: string,
  businessName: string,
  category: string,
  details: string,
  productName?: string
) => {
  let prompt = "";

  switch (type) {
    case "SOCIAL_POST":
      prompt = `
Create a professional social media post.

Business: ${businessName}
Category: ${category}

Details:
${details}

Requirements:
- Engaging
- Professional
- Include emojis
- Include call to action
- Maximum 150 words
`;
      break;

    case "PROMOTION":
      prompt = `
Create a promotional marketing message.

Business: ${businessName}
Category: ${category}

Promotion:
${details}

Requirements:
- Persuasive
- Professional
- Urgency
- Maximum 120 words
`;
      break;

    case "PRODUCT_DESCRIPTION":
      prompt = `
Create a product description.

Business: ${businessName}
Product: ${productName}

Details:
${details}

Requirements:
- Professional
- Sales-focused
- Maximum 200 words
`;
      break;
  }

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: prompt,
  });

  return response.output_text;
};