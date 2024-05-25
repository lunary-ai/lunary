type EvaluatorType = "pii"
type EvaluatorMode = "normal" | "realtime"

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

export interface NormalEvaluator extends BaseEvaluator {
  mode: "normal"
}

export interface RealtimeEvaluator extends BaseEvaluator {
  mode: "realtime"
  filters: any // TODO
}

type Evaluator = NormalEvaluator | RealtimeEvaluator
