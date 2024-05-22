type EvaluatorType = any // TODO
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

interface NormalEvaluator extends BaseEvaluator {
  mode: "normal"
}

interface RealtimeEvaluator extends BaseEvaluator {
  mode: "realtime"
  filters: any // TODO
}

type Evaluator = NormalEvaluator | RealtimeEvaluator

export * as pii from "./pii"
