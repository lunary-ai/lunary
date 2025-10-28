import type { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { getMaxTokenParam, normalizeTemperature } from "shared";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { rowId } = req.body;

    // Initialize the OpenAI client inside the API route handler
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate a user message
    const userMessageResponse = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content:
            "Generate a realistic customer support question about a product or service. Make it specific and detailed, as if a real customer was asking for help. Don't include any preamble or explanation, just the question itself.",
        },
      ],
      temperature: normalizeTemperature("gpt-5", 0.8),
      top_p: 1.0,
      ...getMaxTokenParam("gpt-5", 2048),
    });

    const userMessage = userMessageResponse.choices[0]?.message?.content || "";

    // Generate context for the message
    const contextResponse = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: `Create a brief context description for this customer support question: "${userMessage}". The context should include relevant details about the customer, their account status, and any previous interactions that would help a support agent understand the situation better. Keep it to 2-3 sentences.`,
        },
      ],
      temperature: normalizeTemperature("gpt-5", 0.7),
      top_p: 1.0,
      ...getMaxTokenParam("gpt-5", 2048),
    });

    const context = contextResponse.choices[0]?.message?.content || "";

    return res.status(200).json({ userMessage, context });
  } catch (error) {
    console.error("Error generating test case:", error);
    return res.status(500).json({ error: "Failed to generate test case" });
  }
}
