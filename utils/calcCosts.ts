import { Input } from "@mantine/core"

interface ModelCost {
  models: string[]
  maxTokens: number
  inputCost: number
  outputCost: number
}

// Costs are in USD per 1000 tokens
const MODEL_COSTS: ModelCost[] = [
  {
    models: [
      "gpt-3.5-turbo",
      "gpt-35-turbo",
      "gpt-3.5-turbo-0613",
      "gpt-3.5-turbo-0301",
      "gpt-3.5-turbo-instruct",
    ],
    maxTokens: 4096,
    inputCost: 0.0015,
    outputCost: 0.002,
  },
  {
    models: ["text-davinci-003"],
    maxTokens: 4097,
    inputCost: 0.002,
    outputCost: 0.002,
  },
  {
    models: ["gpt-35-turbo-16k", "gpt-3.5-turbo-16k", "gpt-3.5-turbo-16k-0613"],
    maxTokens: 16384,
    inputCost: 0.003,
    outputCost: 0.004,
  },
  {
    models: ["gpt-4", "gpt-4-0613", "gpt-4-0314"],
    maxTokens: 8192,
    inputCost: 0.03,
    outputCost: 0.06,
  },
  {
    models: ["gpt-4-32k", "gpt-4-32k-0314", "gpt-4-32k-0613"],
    maxTokens: 8192,
    inputCost: 0.06,
    outputCost: 0.12,
  },
  {
    models: ["claude-instant-1", "claude-instant-v1"],
    maxTokens: 100000,
    inputCost: 0.00163,
    outputCost: 0.00551,
  },
  {
    models: ["claude-2", "claude-v2", "claude-1", "claude-v1"],
    maxTokens: 100000,
    inputCost: 0.01102,
    outputCost: 0.03268,
  },
  {
    models: ["text-bison-001"],
    maxTokens: 8192,
    inputCost: 0.004,
    outputCost: 0.004,
  },
  {
    models: ["chat-bison-001"],
    maxTokens: 4096,
    inputCost: 0.002,
    outputCost: 0.002,
  },
  {
    models: ["command-nightly"],
    maxTokens: 4096,
    inputCost: 0.015,
    outputCost: 0.015,
  },
]

export const calcRunCost = (run) => {
  const modelCost = MODEL_COSTS.find((c) => c.models.includes(run.name))
  if (!modelCost) {
    return 0
  }
  const inputCost = (modelCost.inputCost * run.prompt_tokens) / 1000
  const outputCost = (modelCost.outputCost * run.completion_tokens) / 1000
  return inputCost + outputCost
}
