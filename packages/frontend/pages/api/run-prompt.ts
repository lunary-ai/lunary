import type { NextApiRequest, NextApiResponse } from "next"
import { OpenAI } from "openai"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { version, userMessage, context } = req.body

    if (!version || !userMessage) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    // Initialize the OpenAI client inside the API route handler
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const prompt = `${userMessage}\n\nContext: ${context || ""}`

    const response = await openai.chat.completions.create({
      model: version.model,
      messages: [
        {
          role: "system",
          content: version.systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: version.temperature,
      max_tokens: version.max_tokens,
      top_p: version.top_p,
    })

    return res.status(200).json({ response: response.choices[0]?.message?.content || "No response generated" })
  } catch (error) {
    console.error("Error running prompt:", error)
    return res.status(500).json({ error: "Failed to run prompt" })
  }
}
