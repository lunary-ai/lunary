import type { EvaluationResult } from "./evaluator-types"

export interface PromptVersion {
  id: string
  name: string
  systemPrompt: string
  model: string
  temperature: number
  max_tokens: number
  top_p: number
}

export interface ComparisonRow {
  id: string
  userMessage: string
  context: string
  responses: Record<string, string>
  evaluationResults?: Record<string, Record<string, EvaluationResult>>
  // Format: { columnId: { evaluatorId: EvaluationResult } }
}

export interface ComparisonColumn {
  id: string
  promptVersionId: string | null
}
