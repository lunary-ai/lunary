import type { NextApiRequest, NextApiResponse } from "next"
import { OpenAI } from "openai"

// Helper function to extract JSON from potential markdown code blocks
function extractJsonFromText(text: string): string {
  // Check if the text contains a markdown code block
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/
  const match = text.match(codeBlockRegex)

  if (match && match[1]) {
    // Return the content inside the code block
    return match[1].trim()
  }

  // If no code block is found, return the original text
  return text.trim()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { evaluator, userMessage, context, response } = req.body

    if (!evaluator || !response) {
      return res.status(400).json({ error: "Missing required parameters" })
    }

    // Create a prompt for the evaluator based on its type
    let prompt = ""
    let systemPrompt = ""

    switch (evaluator.id) {
      case "relevance":
        systemPrompt = `You are an expert evaluator assessing the relevance of AI responses to user queries. 
        Your task is to determine how well the response addresses the user's specific question or request.
        Provide a score from 0 to 1 (where 1 is perfectly relevant) and brief feedback.
        Return ONLY a JSON object with no markdown formatting.`

        prompt = `User Query: ${userMessage}
        Context: ${context || "No additional context provided"}
        Response to Evaluate: ${response}
        
        Evaluate the relevance of this response to the user query. Consider:
        - Does it directly address what the user asked?
        - Is the information provided what the user was looking for?
        - Does it stay on topic without unnecessary tangents?
        
        Threshold for relevance: ${evaluator.parameters.threshold}
        
        Provide your evaluation as a JSON object with the following format (and NOTHING else):
        {
          "score": [number between 0 and 1],
          "feedback": [brief explanation of your evaluation]
        }`
        break

      // Add other cases as needed
      default:
        return res.status(400).json({ error: "Unknown evaluator type" })
    }

    // Run the evaluation using OpenAI
    try {
      // Initialize the OpenAI client inside the API route handler
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      })

      const text = completion.choices[0]?.message?.content || ""

      // Extract JSON from potential markdown code blocks
      const jsonText = extractJsonFromText(text)

      // Parse the JSON response
      try {
        const result = JSON.parse(jsonText)
        return res.status(200).json(result)
      } catch (error) {
        return res.status(200).json({
          score: 0.5,
          feedback: "Failed to parse evaluation result. Using default score.",
        })
      }
    } catch (error) {
      return res.status(200).json({
        score: 0.5,
        feedback: `The evaluator encountered an error. Using default score.`,
      })
    }
  } catch (error) {
    console.error("Error running evaluation:", error)
    return res.status(500).json({ error: "Failed to run evaluation" })
  }
}
