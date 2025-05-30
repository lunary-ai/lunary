"use server"

import type { PromptVersion } from "@/types/prompt-types"

export async function runSinglePrompt(version: PromptVersion, userMessage: string, context: string): Promise<string> {
  try {
    // Use fetch to call our API route instead of initializing OpenAI directly
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/run-prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version,
        userMessage,
        context,
      }),
    })

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`)
    }

    const data = await response.json()
    return data.response || "No response generated"
  } catch (error) {
    console.error("Error running prompt:", error)
    throw new Error("Failed to run prompt")
  }
}

export async function runAllPrompts() {
  // This function is intentionally left blank as it's not used in the provided code.
  // It's included to satisfy the missing export requirement.
}
