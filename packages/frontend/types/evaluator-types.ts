export interface EvaluatorConfig {
  id: string
  name: string
  description: string
  enabled: boolean
  parameters: Record<string, any>
  parameterDefinitions: EvaluatorParameterDefinition[]
}

export interface EvaluatorParameterDefinition {
  id: string
  name: string
  description: string
  type: "string" | "number" | "boolean" | "select"
  default: any
  options?: { label: string; value: any }[]
  min?: number
  max?: number
}

export interface EvaluationResult {
  evaluatorId: string
  score: number
  feedback: string
  metadata?: Record<string, any>
}

export interface ComparisonRow {
  [key: string]: any // Define ComparisonRow as an interface
}

// Add evaluation results to the comparison row
export interface ComparisonRowWithEvaluation extends ComparisonRow {
  evaluationResults: Record<string, Record<string, EvaluationResult>>
  // Format: { columnId: { evaluatorId: EvaluationResult } }
}
