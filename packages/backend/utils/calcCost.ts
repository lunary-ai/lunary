interface ModelCost {
  models: string[]
  inputCost: number
  outputCost: number
}

// Costs are in USD per 1000 tokens
const MODEL_COSTS: ModelCost[] = [
  {
    models: ["ft:gpt-3.5-turbo"],
    inputCost: 0.003,
    outputCost: 0.006,
  },
  {
    // Older deprecated model
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
    models: ["gpt-3.5-turbo", "gpt-3.5-turbo-1106"],
    inputCost: 0.001,
    outputCost: 0.002,
  },
  {
    models: ["text-davinci-003"],
    inputCost: 0.002,
    outputCost: 0.002,
  },
  {
    models: ["gpt-4-1106", "gpt-4-vision"],
    inputCost: 0.01,
    outputCost: 0.03,
  },
  {
    models: ["gpt-4", "gpt-4-0613", "gpt-4-0314"],
    inputCost: 0.03,
    outputCost: 0.06,
  },
  {
    models: ["gpt-4-32k"],
    inputCost: 0.06,
    outputCost: 0.12,
  },
  {
    models: ["claude-instant-1", "claude-instant-v1"],
    inputCost: 0.00163,
    outputCost: 0.00551,
  },
  {
    models: ["claude-2", "claude-v2", "claude-1", "claude-v1"],
    inputCost: 0.01102,
    outputCost: 0.03268,
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
]

export function calcRunCost(run: any) {
  if (run.endedAt && run.duration < 0.01 * 1000) return 0 // cached llm calls
  if (run.type !== "llm" || !run.name) return 0

  const modelCost = MODEL_COSTS.find((c) =>
    c.models.find((m) =>
      // Azure models have a different naming scheme
      run.name?.replaceAll("gpt-35", "gpt-3.5").includes(m),
    ),
  )

  if (!modelCost) return 0

  const promptTokens = run.promptTokens || 0
  const completionTokens = run.completionToken || 0

  const inputCost = (modelCost.inputCost * promptTokens) / 1000
  const outputCost = (modelCost.outputCost * completionTokens) / 1000
  return inputCost + outputCost
}
