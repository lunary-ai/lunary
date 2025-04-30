import type { PromptVersion } from "@/types/prompt-types"

// Predefined prompt versions (simulating DB storage)
export const predefinedPromptVersions: PromptVersion[] = [
  {
    id: "1",
    name: "Support Assistant v1",
    systemPrompt:
      "You are an AI-powered Aircall Customer Support Assistant. Your role is to provide accurate, helpful, and concise responses to user queries about Aircall's products and services.",
    model: "gpt-4o",
    temperature: 1.0,
    max_tokens: 2048,
    top_p: 1.0,
  },
  {
    id: "2",
    name: "Support Assistant v2",
    systemPrompt:
      "You are an AI-powered Aircall Customer Support Assistant. Your role is to provide accurate, helpful, and concise responses to user queries about Aircall's products and services. Focus on being friendly and personable in your responses.",
    model: "gpt-4o",
    temperature: 1.0,
    max_tokens: 2048,
    top_p: 1.0,
  },
  {
    id: "3",
    name: "Support Assistant v3",
    systemPrompt:
      "You are an AI-powered Aircall Customer Support Assistant. Your role is to provide accurate, helpful, and concise responses to user queries about Aircall's products and services. Be direct and to the point, focusing on technical accuracy above all else.",
    model: "gpt-4o",
    temperature: 1.0,
    max_tokens: 2048,
    top_p: 1.0,
  },
]
