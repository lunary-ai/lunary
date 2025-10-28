import type { EvaluationResult } from "./evaluator-types";
import type {
  AnthropicThinkingConfig,
  OpenAIReasoningEffort,
} from "shared";

export interface PromptVersion {
  id: string;
  templateId: number;
  name: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  reasoning_effort?: OpenAIReasoningEffort | null;
  thinking?: AnthropicThinkingConfig | null;
}

export interface ComparisonRow {
  id: string;
  userMessage: string;
  context: string;
  responses: Record<string, string>;
  evaluationResults?: Record<string, Record<string, EvaluationResult>>;
  // Format: { columnId: { evaluatorId: EvaluationResult } }
}

export interface ComparisonColumn {
  id: string;
  promptTemplateId: number | null;
  promptVersionId: string | null;
}

export type PromptMessage = {
  role: "system" | "user" | "assistant" | string;
  content: string;
};

// API template prompt types
export type APIPrompt = {
  id: number;
  createdAt: string;
  ownerId: string;
  name: string | null;
  group: string | null;
  slug: string;
  projectId: string;
  mode: "openai" | string;
  versions: APIPromptVersion[];
};

export type APIPromptVersion = {
  id: number;
  createdAt: string;
  extra: {
    model: string;
    max_tokens: number;
    temperature: number;
    reasoning_effort?: OpenAIReasoningEffort | null;
    thinking?: AnthropicThinkingConfig | null;
    [key: string]: unknown;
  };
  content: PromptMessage[];
  templateId: number;
  version: string | null;
  testValues: Record<string, unknown>;
  isDraft: boolean;
  notes: string | null;
  publishedAt: string | null;
};
