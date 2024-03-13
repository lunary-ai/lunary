interface ModelCost {
  models: string[]
  inputCost: number
  outputCost: number
}

// Costs are in USD per 1000 tokens

// OpenAI Pricing: https://openai.com/pricing
// Legacy OpenAI pricing: https://platform.openai.com/docs/deprecations/
const MODEL_COSTS: ModelCost[] = [
  {
    models: ["ft:gpt-3.5-turbo"],
    inputCost: 0.003,
    outputCost: 0.006,
  },
  {
    models: ["gpt-3.5-turbo-0613", "gpt-3.5-turbo-0301"],
    inputCost: 0.0015,
    outputCost: 0.002,
  },
  {
    models: ["gpt-3.5-turbo-instruct"],
    inputCost: 0.0015,
    outputCost: 0.002,
  },
  {
    models: ["gpt-3.5-turbo-16k"],
    inputCost: 0.003,
    outputCost: 0.004,
  },
  {
    models: ["gpt-3.5-turbo-1106"],
    inputCost: 0.001,
    outputCost: 0.002,
  },
  {
    models: ["gpt-3.5-turbo", "gpt-3.5-turbo-0125"],
    inputCost: 0.0005,
    outputCost: 0.0015,
  },
  {
    models: ["text-davinci-003"],
    inputCost: 0.02,
    outputCost: 0.02,
  },
  {
    models: [
      "gpt-4-turbo",
      "gpt-4-vision",
      "gpt-4-1106",
      "gpt-4-1106-vision",
      "gpt-4-0125",
    ],
    inputCost: 0.01,
    outputCost: 0.03,
  },
  {
    models: ["gpt-4-32k"],
    inputCost: 0.06,
    outputCost: 0.12,
  },
  {
    models: ["gpt-4", "gpt-4-0613", "gpt-4-0314"],
    inputCost: 0.03,
    outputCost: 0.06,
  },
  {
    models: ["claude-instant-1", "claude-instant-v1", "claude-instant-1.2"],
    inputCost: 0.0008,
    outputCost: 0.0024,
  },
  {
    models: ["claude-2", "claude-v2", "claude-1", "claude-v1", "claude-2.1"],
    inputCost: 0.008,
    outputCost: 0.024,
  },
  {
    models: ["claude-3-opus"],
    inputCost: 0.015,
    outputCost: 0.075,
  },
  {
    models: ["claude-3-sonet"],
    inputCost: 0.003,
    outputCost: 0.075,
  },
  {
    models: ["claude-3-haiku"],
    inputCost: 0.00025,
    outputCost: 0.00125,
  },
  {
    models: ["text-bison", "chat-bison", "code-bison", "codechat-bison"],
    inputCost: 0.0005,
    outputCost: 0.0005,
  },
  {
    models: ["command-nightly", "command"],
    inputCost: 0.015,
    outputCost: 0.015,
  },
  {
    models: ["whisper"],
    inputCost: 0.1, // $ per 1000 seconds
    outputCost: 0,
  },
  {
    models: ["tts-1-hd"],
    inputCost: 0.03,
    outputCost: 0,
  },
  {
    models: ["tts-1"],
    inputCost: 0.015,
    outputCost: 0,
  },
  {
    models: ["mistral-tiny"],
    inputCost: 0.00014,
    outputCost: 0.00042,
  },
  {
    models: ["mistral-small"],
    inputCost: 0.0006,
    outputCost: 0.0018,
  },
  {
    models: ["mistral-medium"],
    inputCost: 0.0006,
    outputCost: 0.0018,
  },
]

export function calcRunCost(run: any) {
  if (run.duration && run.duration < 0.01 * 1000) return null // cached llm calls
  if (run.type !== "llm" || !run.name) return null

  const modelCost = MODEL_COSTS.find((c) =>
    c.models.find((model) => {
      const cleanedName = run.name
        .toLowerCase()
        .replaceAll("gpt4", "gpt-4")
        .replaceAll("gpt3", "gpt-3")
        .replaceAll("gpt-35", "gpt-3.5")
        .replaceAll("claude3", "claude-3")
        .replaceAll("claude2", "claude-2")
        .replaceAll("claude1", "claude-1")

      // Azure models have a different naming scheme
      return cleanedName.includes(model)
    }),
  )

  if (!modelCost) return null

  const promptTokens = run.promptTokens || 0
  const completionTokens = run.completionTokens || 0

  const inputCost = (modelCost.inputCost * promptTokens) / 1000
  const outputCost = (modelCost.outputCost * completionTokens) / 1000
  return inputCost + outputCost
}
