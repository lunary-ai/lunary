export type EvaluatorType =
  | "pii"
  | "summarization"
  | "sentiment"
  | "language"
  | "toxicity"
  | "assert"
  | "topics"
  | "tone"
  | "factualness"
  | "geval"
  | "guidelines"
  | "replies"
export type EvaluatorMode = "normal" | "realtime"

interface BaseEvaluator {
  id: string
  createdAt: string
  updatedAt: string
  projectId: string
  ownerId?: string
  name: string
  slug: string
  description?: string
  type: EvaluatorType
  mode: EvaluatorMode
  params: any // TODO
}

interface NormalEvaluator extends BaseEvaluator {
  mode: "normal"
}

interface RealtimeEvaluator extends BaseEvaluator {
  mode: "realtime"
  filters: any // TODO
}

type Evaluator = NormalEvaluator | RealtimeEvaluator
